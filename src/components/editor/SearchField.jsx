import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import "leaflet-geosearch/dist/geosearch.css";

function simplifyAddress(label) {
  if (!label) return "";
  const parts = label.split(', ');
  // Filter out parts that are numbers only (often zip codes of larger areas) or common administrative terms
  const toRemove = /^(département|region|état|county|country|land)/i;
  const filteredParts = parts.filter(part => {
    if (toRemove.test(part)) return false;
    // Remove larger administrative names (often in capitals)
    if (part === part.toUpperCase() && part.length > 3 && !part.match(/\d/)) {
      const lowerPart = part.toLowerCase();
      if (lowerPart.includes('france') || lowerPart.includes('metropolitan')) return false;
    }
    return true;
  });

  // Try to find street, postcode, city
  const addressRegex = /^(.*, \d{5} .*, France)$/;
  if (addressRegex.test(label)) {
    const mainAddress = label.match(addressRegex)[1];
    return mainAddress.replace(', France', '');
  }

  // A simpler fallback
  if (filteredParts.length > 3) {
    return filteredParts.slice(0, 3).join(', ');
  }

  return filteredParts.join(', ');
}


export default function SearchField({ onAddressFound }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const provider = new OpenStreetMapProvider({
      params: {
        'accept-language': 'fr',
        countrycodes: 'fr',
      },
    });

    const searchControl = new GeoSearchControl({
      provider,
      style: "bar",
      autoComplete: true,
      autoCompleteDelay: 200,
      showMarker: false,
      showPopup: false,
      keepResult: true,
      autoClose: true,
      searchLabel: "Rechercher une adresse…",
      retainZoomLevel: false,
      resultFormat: ({ result }) => simplifyAddress(result.label),
    });

    try {
      map.addControl(searchControl);
      // Add hide-on-capture class to search control
      setTimeout(() => {
        const searchContainer = document.querySelector('.leaflet-control-geosearch');
        if (searchContainer) {
          searchContainer.classList.add('hide-on-capture');
        }
      }, 100);
    } catch { }

    const handler = (e) => {
      try {
        const { x: lng, y: lat, label } = e.location || {};
        if (lat && lng) {
          map.setView([lat, lng], Math.max(map.getZoom(), 18), { animate: true });
          onAddressFound?.({ lat, lng, label: simplifyAddress(label) });
        }
      } catch { }
    };

    map.on("geosearch/showlocation", handler);

    return () => {
      try {
        map.off("geosearch/showlocation", handler);
        map.removeControl(searchControl);
      } catch { }
    };
  }, [map, onAddressFound]);

  return null;
}