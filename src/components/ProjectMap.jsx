import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import MapEditor from "./editor/MapEditor";
// import ChatBox from "./editor/ChatBox.jsx"; // Remplacé par BuildingForm
import SymbolsPanel from "./editor/SymbolsPanel.jsx";
import PhotoManager from "./editor/PhotoManager.jsx";
import BuildingForm from "./editor/BuildingForm.jsx"; // Importé pour le panneau de droite
import { useProject } from "../contexts/ProjectContext.jsx";

export default function ProjectMap({ onGpsUpdate }) {
  const { project, setProject } = useProject(); // Utilise le contexte
  const rightColRef = useRef(null);
  const [mapHeight, setMapHeight] = useState(900);
  
  // Les captures sont lues DEPUIS le projet
  const captures = project?.captures || [null, null, null, null];

  useLayoutEffect(() => {
    const ro = new (window.ResizeObserver || class { observe(){} disconnect(){} })(() => {
      if (!rightColRef.current) return;
      const h = rightColRef.current.getBoundingClientRect().height;
      setMapHeight(Math.max(600, Math.round(h)));
    });
    if (rightColRef.current && ro.observe) ro.observe(rightColRef.current);
    return () => ro.disconnect && ro.disconnect();
  }, []);

  // Écoute l'événement de retour de MapElements
  useEffect(() => {
    const handleCaptureDone = (e) => {
        const { slotIndex, dataUrl } = e.detail;
        const next = [...captures];
        next[slotIndex] = dataUrl;
        // Met à jour l'objet projet principal
        setProject(prev => ({ ...prev, captures: next }));
    };
    
    // Le nom de l'événement est "map:capture-done"
    window.addEventListener("map:capture-done", handleCaptureDone);
    return () => {
        window.removeEventListener("map:capture-done", handleCaptureDone);
    };
  }, [captures, setProject]); // Ajout de captures et setProject aux dépendances

  // Demande une capture à MapElements
  const requestCapture = (slotIndex) => {
    // Corrigé : le nom de l'événement est "map:capture-request"
    window.dispatchEvent(new CustomEvent("map:capture-request", { detail: { slotIndex: slotIndex } }));
  };

  return (
    <div className="w-full">
      {/* MODIFICATION DE LA GRILLE :
        - col-span-9  -> col-span-10 (plus large ~83%)
        - col-span-3  -> col-span-2 (plus étroit ~17%)
      */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-10"> {/* Modifié */}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <MapEditor
              onGpsUpdate={onGpsUpdate}
              project={project} // MapEditor a besoin de project
              setProject={setProject} // MapEditor a besoin de setProject
              // onCapture n'est pas nécessaire, la comm se fait par événements window
              className="w-full"
              style={{ height: mapHeight }}
            />
          </div>
        </div>

        <div className="col-span-2 flex flex-col gap-6" ref={rightColRef}> {/* Modifié */}
          
          <div className="rounded-2xl bg-white shadow-sm">
            <div className="border-b px-4 py-3 font-medium">Symboles</div>
             {/* setProject est passé pour que SymbolsPanel puisse utiliser le contexte */}
            <SymbolsPanel project={project} setProject={setProject} />
          </div>
          
          <div className="rounded-2xl bg-white shadow-sm">
            <div className="border-b px-4 py-3 font-medium">Bâtiments prédéfinis</div>
            <div className="p-4">
              <BuildingForm />
            </div>
          </div>

          <div className="rounded-2xl bg-white shadow-sm">
            <div className="border-b px-4 py-3 font-medium">Capturer la vue</div>
            {/* Grille modifiée en 1 colonne car col-span-2 est étroit */}
            <div className="p-4 grid grid-cols-1 gap-3"> 
              {captures.map((c, i) => (
                <div key={i} className="relative aspect-video w-full rounded-xl border overflow-hidden bg-gray-100">
                  {c ? (
                    <img src={c} alt={`capture-${i + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                      Vide
                    </div>
                  )}
                  <button
                    onClick={() => requestCapture(i)}
                    className="absolute top-1 right-1 rounded-md bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
                  >
                    Capturer
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white shadow-sm">
        <div className="border-b px-4 py-3 font-medium flex items-center justify-between">
          <span>Photos</span>
          <div className="text-sm text-gray-500">Jusqu’à 16 photos (2 × 8)</div>
        </div>
        <div className="p-4">
          <PhotoManager maxPhotos={16} columns={8} />
        </div>
      </div>
    </div>
  );
}