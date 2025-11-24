import React from "react";
import { Trash2, Mountain, Square, RotateCw, Ruler, Pentagon } from "lucide-react";

const btnBase =
  "flex items-center justify-center w-[140px] mb-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow hover:bg-slate-50 focus:outline-none";
const btnActive =
  "ring-2 ring-offset-1 ring-blue-500 border-blue-500 !bg-blue-50";

export default function MapDrawingTools({ mode, toggle }) {
  const btnBase = "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md";
  const btnActive = "bg-blue-600 text-white";
  const btnInactive = "bg-white text-gray-700 hover:bg-gray-50";

  const handleClick = (e, newMode) => {
    e.preventDefault();
    toggle(newMode);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4 hide-on-capture">
      <button
        type="button"
        className={`${btnBase} ${mode === "line" ? btnActive : btnInactive}`}
        onClick={(e) => handleClick(e, "line")}
        title="Distance (L)"
      >
        <Ruler className="h-4 w-4" />
        Distance
      </button>

      <button
        type="button"
        className={`${btnBase} ${mode === "polygon" ? btnActive : btnInactive}`}
        onClick={(e) => handleClick(e, "polygon")}
        title="Surface (P)"
      >
        <Pentagon className="h-4 w-4" />
        Surface
      </button>

      <button
        type="button"
        className={`${btnBase} ${mode === "rectangle" ? btnActive : btnInactive}`}
        onClick={(e) => handleClick(e, "rectangle")}
        title="Rectangle / Bâtiment (B)"
      >
        <Square className="h-4 w-4" />
        Rectangle
      </button>

      <button
        type="button"
        className={`${btnBase} ${mode === "altimetry" ? btnActive : btnInactive}`}
        onClick={(e) => handleClick(e, "altimetry")}
        title="Profil altimétrique (A)"
      >
        <Mountain className="h-4 w-4" />
        Profil Alti
      </button>

      <button
        type="button"
        className={`${btnBase} ${mode === "azimuth" ? btnActive : btnInactive}`}
        onClick={(e) => handleClick(e, "azimuth")}
        title="Mesurer un azimut (Z)"
      >
        <RotateCw className="h-4 w-4" />
        Azimut
      </button>



      <button
        type="button"
        className={`${btnBase} bg-red-600 text-white hover:bg-red-700`}
        onClick={(e) => handleClick(e, "delete")}
        title="Supprimer un tracé (Suppr)"
      >
        <Trash2 className="h-4 w-4" />
        Supprimer
      </button>
    </div>
  );
}