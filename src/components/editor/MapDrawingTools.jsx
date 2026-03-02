import React, { useRef, useEffect } from "react";
import { Trash2, Mountain, Square, RotateCw, Ruler, Pentagon } from "lucide-react";
import L from "leaflet";

// Desktop: full width with text; Mobile: icon-only compact button
const btnBaseDesktop =
  "hidden lg:flex items-center justify-center w-[140px] mb-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow hover:bg-slate-50 focus:outline-none";
const btnBaseMobile =
  "flex lg:hidden items-center justify-center mb-1.5 rounded-md border border-slate-300 bg-white p-2 text-slate-800 shadow hover:bg-slate-50 focus:outline-none";
const btnActive =
  "ring-2 ring-offset-1 ring-blue-500 border-blue-500 !bg-blue-50";
const btnActiveDelete =
  "ring-2 ring-offset-1 ring-red-500 border-red-500 !bg-red-50";

export default function MapDrawingTools({ mode, setMode }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const toggle = (tool) => {
    setMode(mode === tool ? null : tool);
  };

  const handleClick = (e, newMode) => {
    e.preventDefault();
    e.stopPropagation();
    setTimeout(() => {
      toggle(newMode);
    }, 100);
  };

  const tools = [
    { key: "line", Icon: Ruler, label: "Distance", title: "Distance (L)", isDelete: false },
    { key: "polygon", Icon: Pentagon, label: "Surface", title: "Surface (P)", isDelete: false },
    { key: "rectangle", Icon: Square, label: "Rectangle", title: "Rectangle / Bâtiment (B)", isDelete: false },
    { key: "altimetry", Icon: Mountain, label: "Profil Alti", title: "Profil altimétrique (A)", isDelete: false },
    { key: "azimuth", Icon: RotateCw, label: "Azimut", title: "Mesurer un azimut (Z)", isDelete: false },
    { key: "delete", Icon: Trash2, label: "Supprimer", title: "Supprimer un élément (D)", isDelete: true },
  ];

  return (
    <div
      ref={containerRef}
      // Desktop: top-3; Mobile: top-14 to drop below the address search bar
      className="absolute left-3 top-14 lg:top-3 z-[990] hide-on-capture"
      style={{ userSelect: "none" }}
    >
      {tools.map(({ key, Icon, label, title, isDelete }) => {
        const isActive = mode === key;
        const activeClass = isDelete
          ? (isActive ? btnActiveDelete : "")
          : (isActive ? btnActive : "");

        return (
          <React.Fragment key={key}>
            {/* Desktop: icon + text */}
            <button
              type="button"
              className={`${btnBaseDesktop} ${activeClass}`}
              onClick={(e) => handleClick(e, key)}
              title={title}
              tabIndex={-1}
            >
              <Icon className={`h-4 w-4 mr-2 ${isDelete ? "text-red-600" : ""}`} />
              {label}
            </button>

            {/* Mobile/Tablet: icon only */}
            <button
              type="button"
              className={`${btnBaseMobile} ${activeClass}`}
              onClick={(e) => handleClick(e, key)}
              title={title}
              tabIndex={-1}
            >
              <Icon className={`h-4 w-4 ${isDelete ? "text-red-600" : ""}`} />
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}