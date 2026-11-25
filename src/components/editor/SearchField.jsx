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


class GeoportailProvider {
  constructor() {
    this.osmFallback = new OpenStreetMapProvider({
      params: {
        'accept-language': 'fr',
        countrycodes: 'fr',
      },
    });
  }

  async search({ query }) {
    const q = (query || '').trim();
    if (q.length < 2) return [];

    try {
      const url = `https://data.geopf.fr/geocodage/completion/?text=${encodeURIComponent(q)}&type=StreetAddress,PositionOfInterest&maximumResponses=10`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.results) && data.results.length > 0) {
          return data.results
            .filter((item) => Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y)))
            .map((item) => {
              const x = Number(item.x);
              const y = Number(item.y);
              const label =
                item.fulltext ||
                [item.street, item.zipcode, item.city].filter(Boolean).join(', ');
              return {
                x,
                y,
                label,
                bounds: [
                  [y - 0.002, x - 0.002],
                  [y + 0.002, x + 0.002],
                ],
                raw: item,
              };
            });
        }
      }
    } catch (err) {
      console.warn('[SearchField] Erreur API Géoportail completion:', err);
    }

    // Fallback geocodage IGN si completion vide
    try {
      const searchUrl = `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&limit=6`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.features) && data.features.length > 0) {
          return data.features.map((f) => {
            const [x, y] = f.geometry?.coordinates || [0, 0];
            return {
              x: Number(x),
              y: Number(y),
              label: f.properties?.label || q,
              bounds: [
                [Number(y) - 0.002, Number(x) - 0.002],
                [Number(y) + 0.002, Number(x) + 0.002],
              ],
              raw: f,
            };
          });
        }
      }
    } catch (err) {
      console.warn('[SearchField] Erreur API Géoportail search:', err);
    }

    return this.osmFallback.search({ query: q });
  }
}

export default function SearchField({ onAddressFound }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const provider = new GeoportailProvider();

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
          // Also hide the form inside if needed
          const form = searchContainer.querySelector('form');
          if (form) form.classList.add('hide-on-capture');
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

    const searchHandler = async (e) => {
      if (!e.detail || !e.detail.query) return;
      try {
        const results = await provider.search({ query: e.detail.query });
        if (results && results.length > 0) {
          const firstResult = results[0];
          // Manually trigger the selection handling
          const { x: lng, y: lat, label } = firstResult;
          if (lat && lng) {
            map.setView([lat, lng], 18, { animate: true });
            onAddressFound?.({ lat, lng, label: simplifyAddress(label) });
            // Optionally trigger the showlocation event for other listeners (though we just did the work)
            // map.fireEvent('geosearch/showlocation', { location: firstResult, marker: null });
          }
        } else {
          console.warn("No results found for query:", e.detail.query);
        }
      } catch (err) {
        console.error("Search error:", err);
      }
    };

    map.on("geosearch/showlocation", handler);
    map.getContainer().addEventListener('geosearch/search', searchHandler);

    return () => {
      try {
        map.off("geosearch/showlocation", handler);
        map.getContainer().removeEventListener('geosearch/search', searchHandler);
        map.removeControl(searchControl);
      } catch { }
    };
  }, [map, onAddressFound]);

  return null;
}