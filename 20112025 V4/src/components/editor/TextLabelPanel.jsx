import React from "react";
import { useMapEvents } from "react-leaflet";
import L from "leaflet"; // Import L from leaflet

export default function TextLabelPanel() {
  useMapEvents({
    click(e) {
      const text = prompt("Texte à afficher ?");
      if (text) {
        const div = document.createElement("div");
        div.className = "text-label";
        div.innerText = text;

        const icon = L.divIcon({ html: div, className: "" });
        const marker = L.marker(e.latlng, { icon }).addTo(e.target);
      }
    },
  });

  return null;
}