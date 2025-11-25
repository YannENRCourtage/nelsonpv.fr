import React, { useLayoutEffect, useRef, useState } from "react";
import MapEditor from "./MapEditor";
import ChatBox from "./editor/ChatBox.jsx";
import SymbolsPanel from "./editor/SymbolsPanel.jsx";
import PhotoManager from "./editor/PhotoManager.jsx";

export default function ProjectMap({ project, setProject, onGpsUpdate }) {
  const rightColRef = useRef(null);
  const [mapHeight, setMapHeight] = useState(900);
  const [captures, setCaptures] = useState([null, null, null, null]);

  useLayoutEffect(() => {
    const ro = new (window.ResizeObserver || class { observe(){} disconnect(){} })(() => {
      if (!rightColRef.current) return;
      const h = rightColRef.current.getBoundingClientRect().height;
      setMapHeight(Math.max(600, Math.round(h)));
    });
    if (rightColRef.current && ro.observe) ro.observe(rightColRef.current);
    return () => ro.disconnect && ro.disconnect();
  }, []);

  const handleCaptureFromMap = (slotIndex, dataUrl) => {
    setCaptures((prev) => {
      const next = [...prev];
      next[slotIndex] = dataUrl;
      return next;
    });
  };

  const requestCapture = (slotIndex) => {
    window.dispatchEvent(new CustomEvent("map-capture", { detail: { slot: slotIndex } }));
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-9">
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <MapEditor
              onGpsUpdate={onGpsUpdate}
              project={project}
              setProject={setProject}
              onCapture={handleCaptureFromMap}
              className="w-full"
              style={{ height: mapHeight }}
            />
          </div>
        </div>

        <div className="col-span-3 flex flex-col gap-6" ref={rightColRef}>
          <div className="rounded-2xl bg-white shadow-sm">
            <div className="border-b px-4 py-3 font-medium">Chat</div>
            <div className="p-4">
              <ChatBox />
            </div>
          </div>

          <div className="rounded-2xl bg-white shadow-sm">
            <div className="border-b px-4 py-3 font-medium">Symboles</div>
            <div className="p-4">
              <SymbolsPanel project={project} setProject={setProject} />
            </div>
          </div>

          <div className="rounded-2xl bg-white shadow-sm">
            <div className="border-b px-4 py-3 font-medium">Capturer la vue</div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {captures.map((c, i) => (
                <div key={i} className="relative aspect-video w-full rounded-xl border overflow-hidden bg-gray-100">
                  {c ? (
                    <img src={c} alt={`capture-${i + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                      Aucune capture
                    </div>
                  )}
                  <button
                    onClick={() => requestCapture(i)}
                    className="absolute top-2 right-2 rounded-md bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
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