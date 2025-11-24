import React from "react";
import { Trash2, Mountain, Square, RotateCw, Ruler, Pentagon } from "lucide-react";

const btnBase =
  "flex items-center justify-center w-[140px] mb-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow hover:bg-slate-50 focus:outline-none";
const btnActive =
  "ring-2 ring-offset-1 ring-blue-500 border-blue-500 !bg-blue-50";

export default function MapDrawingTools({ mode, setMode }) {
  const toggle = (tool) => {
    setMode(mode === tool ? null : tool);
  };

  return (
    <div
      className="absolute left-3 top-3 z-[990] hide-on-capture"
      style={{ userSelect: "none" }}
    >
      <button
        type="button"
        className={`${btnBase} ${mode === "line" ? btnActive : ""}`}
        onClick={() => toggle("line")}
        title="Distance (L)"
      >
        <Ruler className="h-4 w-4 mr-2" />
        Distance
      </button>

      <button
        type="button"
        className={`${btnBase} ${mode === "polygon" ? btnActive : ""}`}
        onClick={() => toggle("polygon")}
        title="Surface (P)"
      >
        <Pentagon className="h-4 w-4 mr-2" />
        Surface
      </button>

      <button
        type="button"
        className={`${btnBase} ${mode === "rectangle" ? btnActive : ""}`}
        onClick={() => toggle("rectangle")}
        title="Rectangle / Bâtiment (B)"
      >
        <Square className="h-4 w-4 mr-2" />
        Rectangle
      </button>

      <button
        type="button"
        className={`${btnBase} ${mode === "altimetry" ? btnActive : ""}`}
        onClick={() => toggle("altimetry")}
        title="Profil altimétrique (A)"
      >
        <Mountain className="h-4 w-4 mr-2" />
        Profil Alti
      </button>

      <button
        type="button"
        className={`${btnBase} ${mode === "azimuth" ? btnActive : ""}`}
        onClick={() => toggle("azimuth")}
        title="Mesurer un azimut (Z)"
      >
        <RotateCw className="h-4 w-4 mr-2" />
        Azimut
      </button>



      <button
        type="button"
        className={`${btnBase} ${mode === "delete" ? "ring-2 ring-offset-1 ring-red-500 border-red-500 !bg-red-50" : ""}`}
        onClick={() => toggle("delete")}
        title="Supprimer un élément (D)"
      >
        <Trash2 className="h-4 w-4 mr-2 text-red-600" />
        Supprimer
      </button>
    </div>
  );
}