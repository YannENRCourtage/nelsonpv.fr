import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { Search, MapPin, X, Loader2 } from "lucide-react";
import "leaflet-geosearch/dist/geosearch.css";

async function fetchGeoportailSuggestions(rawQuery, signal) {
  const q = (rawQuery || "").trim();
  if (q.length < 2) return [];

  try {
    const url = `https://data.geopf.fr/geocodage/completion/?text=${encodeURIComponent(
      q
    )}&type=StreetAddress,PositionOfInterest&maximumResponses=8`;
    const res = await fetch(url, { signal });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.results) && data.results.length > 0) {
        return data.results
          .filter(
            (item) =>
              Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y))
          )
          .map((item, idx) => {
            const x = Number(item.x);
            const y = Number(item.y);
            const label =
              item.fulltext ||
              [item.street, item.zipcode, item.city].filter(Boolean).join(", ");
            const streetPart =
              item.street || (label.split(",")[0] || "").trim();
            return {
              id: `${item.zipcode || ""}_${x}_${y}_${idx}`,
              x,
              y,
              label,
              properties: {
                label,
                name: streetPart,
                street: streetPart,
                postcode: item.zipcode || "",
                city: item.city || "",
              },
              raw: item,
            };
          });
      }
    }
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    console.warn("[SearchField] Erreur API Géoportail completion:", err);
  }

  try {
    const searchUrl = `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(
      q
    )}&limit=6`;
    const res = await fetch(searchUrl, { signal });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.features) && data.features.length > 0) {
        return data.features.map((f, idx) => {
          const [x, y] = f.geometry?.coordinates || [0, 0];
          const props = f.properties || {};
          return {
            id: props.id || `${x}_${y}_${idx}`,
            x: Number(x),
            y: Number(y),
            label: props.label || q,
            properties: props,
            raw: f,
          };
        });
      }
    }
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    console.warn("[SearchField] Erreur API Géoportail search:", err);
  }

  return [];
}

export default function SearchField({ onAddressFound }) {
  const map = useMap();
  const containerRef = useRef(null);
  const onAddressFoundRef = useRef(onAddressFound);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const isUserTypingRef = useRef(false);

  useEffect(() => {
    onAddressFoundRef.current = onAddressFound;
  }, [onAddressFound]);

  // Empêcher la propagation des clics/scrolls vers la carte Leaflet sans bloquer les événements React
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    L.DomEvent.disableScrollPropagation(el);
    L.DomEvent.on(el, "dblclick contextmenu", L.DomEvent.stopPropagation);
    L.DomEvent.on(el, "click mousedown touchstart", L.DomEvent.fakeStop);
    return () => {
      L.DomEvent.off(el, "dblclick contextmenu", L.DomEvent.stopPropagation);
      L.DomEvent.off(el, "click mousedown touchstart", L.DomEvent.fakeStop);
    };
  }, []);

  // Fermer la liste au clic en dehors
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Autocomplétion en direct pendant la saisie de chaque caractère
  useEffect(() => {
    if (!isUserTypingRef.current) return;
    const trimmed = (query || "").trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await fetchGeoportailSuggestions(
          trimmed,
          controller.signal
        );
        setSuggestions(results);
        setActiveIndex(-1);
        setIsOpen(results.length > 0);
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("[SearchField] Autocomplete error:", err);
        }
      } finally {
        setLoading(false);
      }
    }, 120);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const selectSuggestion = async (item) => {
    if (!item) return;
    isUserTypingRef.current = false;
    setQuery(item.label || "");
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);

    let lng = Number(item.x);
    let lat = Number(item.y);
    let label = item.label;
    let properties = item.properties || {};
    let raw = item.raw;

    if ((!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) && label) {
      try {
        const fallbackResults = await fetchGeoportailSuggestions(label);
        const firstValid = fallbackResults.find(
          (r) => Number.isFinite(r.y) && Number.isFinite(r.x) && r.y !== 0 && r.x !== 0
        );
        if (firstValid) {
          lng = Number(firstValid.x);
          lat = Number(firstValid.y);
          properties = firstValid.properties || properties;
          raw = firstValid.raw || raw;
        }
      } catch (err) {
        console.warn("[SearchField] Fallback geocoding error:", err);
      }
    }

    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      const targetZoom = 18;
      map.setView([lat, lng], targetZoom, { animate: false });
      onAddressFoundRef.current?.({
        lat,
        lng,
        label,
        properties,
      });
      window.dispatchEvent(
        new CustomEvent("map:goto-address", {
          detail: { lat, lng, zoom: targetZoom },
        })
      );
      try {
        map.fireEvent("geosearch/showlocation", {
          location: { x: lng, y: lat, lat, lng, label, raw },
          marker: null,
        });
      } catch {}
    }
  };

  // Support de l'événement externe 'geosearch/search' (bouton Adresse Projet / StreetView)
  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();

    const searchHandler = async (e) => {
      const q = e?.detail?.query;
      if (!q) return;
      try {
        const results = await fetchGeoportailSuggestions(q);
        if (results && results.length > 0) {
          selectSuggestion(results[0]);
        }
      } catch (err) {
        console.error("[SearchField] External search error:", err);
      }
    };

    container.addEventListener("geosearch/search", searchHandler);
    return () => {
      container.removeEventListener("geosearch/search", searchHandler);
    };
  }, [map]);

  const handleKeyDown = async (e) => {
    if (e.key === "ArrowDown") {
      if (suggestions.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      if (suggestions.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
        selectSuggestion(suggestions[activeIndex]);
      } else if (suggestions.length > 0) {
        selectSuggestion(suggestions[0]);
      } else if (query.trim().length >= 2) {
        setLoading(true);
        try {
          const results = await fetchGeoportailSuggestions(query.trim());
          if (results.length > 0) {
            selectSuggestion(results[0]);
          }
        } finally {
          setLoading(false);
        }
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="leaflet-control-geosearch hide-on-capture no-print"
      style={{
        position: "absolute",
        top: "10px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1005,
        width: "400px",
        maxWidth: "calc(100% - 130px)",
        margin: 0,
        pointerEvents: "auto",
      }}
    >
      <div className="relative w-full bg-white rounded shadow-md border border-gray-300">
        <div className="flex items-center h-[32px] px-2.5">
          <Search size={14} className="text-gray-400 mr-2 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              isUserTypingRef.current = true;
              setQuery(e.target.value);
            }}
            onFocus={() => {
              if (suggestions.length > 0) {
                setIsOpen(true);
              } else if (query.trim().length >= 2) {
                isUserTypingRef.current = true;
                setQuery((q) => q);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une adresse…"
            autoComplete="off"
            className="w-full h-full text-xs text-gray-900 bg-transparent outline-none border-none pr-6"
          />
          {loading ? (
            <Loader2
              size={14}
              className="animate-spin text-blue-500 shrink-0 ml-1"
            />
          ) : (
            query && (
              <button
                type="button"
                onClick={() => {
                  isUserTypingRef.current = false;
                  setQuery("");
                  setSuggestions([]);
                  setIsOpen(false);
                }}
                className="text-gray-400 hover:text-gray-700 p-0.5 rounded"
                title="Effacer la recherche"
              >
                <X size={14} />
              </button>
            )
          )}
        </div>

        {isOpen && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-72 overflow-y-auto z-[1010] divide-y divide-gray-100">
            {suggestions.map((item, idx) => (
              <button
                key={item.id || idx}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectSuggestion(item);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectSuggestion(item);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                  idx === activeIndex
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-800 hover:bg-gray-50"
                }`}
              >
                <MapPin
                  size={14}
                  className={`shrink-0 ${
                    idx === activeIndex ? "text-blue-600" : "text-gray-400"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
