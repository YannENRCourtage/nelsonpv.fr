// src/components/editor/MapEvents.jsx
import React, { useEffect } from "react";
import L from "leaflet";

const ICONS = {
  project: "📍",
  access: "🚪",
  house: "🏠",
  sdis: "🚒",
  transfo: "⚡",
  pdl: "🔌",
  voisin: "👥",
  building: "🏢",
};

function asDivIcon(emoji) {
  return L.divIcon({
    className: "nelson-emoji-pin",
    html: `<div style="
      font-size:20px; line-height:20px; 
      transform: translate(-50%,-50%);
      filter: drop-shadow(0 1px 2px rgba(0,0,0,.35));
    ">${emoji}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export default function MapEvents({ map, onRightClick }) {
  useEffect(() => {
    if (!map) return;

    // Gestion du clic droit
    if (onRightClick) {
      map.on("contextmenu", (e) => {
        onRightClick(e.latlng);
      });
    }

    /** Drag & drop depuis la colonne de droite */
    function onDragOver(ev) {
      if (ev.dataTransfer?.types?.includes("text/symbol")) {
        ev.preventDefault();
      }
    }

    function onDrop(ev) {
      const t = ev.dataTransfer?.getData("text/symbol");
      if (!t) return;

      const latlng = map.mouseEventToLatLng(ev);
      const emoji = ICONS[t] || ICONS.project;

      L.marker(latlng, { icon: asDivIcon(emoji) }).addTo(map);
      ev.preventDefault();
    }

    const container = map.getContainer();
    container.addEventListener("dragover", onDragOver);
    container.addEventListener("drop", onDrop);

    /** Bulle GPS bas-droite */
    const coordCtl = L.control({ position: "bottomright" });
    coordCtl.onAdd = function () {
      const div = L.DomUtil.create("div", "nelson-gps");
      div.style.background = "white";
      div.style.border = "1px solid #e5e7eb";
      div.style.borderRadius = "8px";
      div.style.padding = "6px 10px";
      div.style.font = "12px/16px system-ui, -apple-system, Segoe UI, Roboto";
      div.style.color = "#111827";
      div.innerHTML = "GPS: –";
      map.on("mousemove", (e) => {
        div.innerHTML = `GPS: ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
      });
      return div;
    };
    coordCtl.addTo(map);

    return () => {
      container.removeEventListener("dragover", onDragOver);
      container.removeEventListener("drop", onDrop);
      coordCtl.remove();
    };
  }, [map]);

  return null;
}