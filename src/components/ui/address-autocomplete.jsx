import React, { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { Search, MapPin, Loader2 } from 'lucide-react';

async function fetchGeoportailCompletionFeatures(rawQuery, signal) {
  const q = (rawQuery || '').trim();
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
          .filter((item) => Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y)))
          .map((item, idx) => {
            const x = Number(item.x);
            const y = Number(item.y);
            const fulltext =
              item.fulltext ||
              [item.street, item.zipcode, item.city].filter(Boolean).join(', ');
            const streetPart =
              item.street || (fulltext.split(',')[0] || '').trim();
            return {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [x, y],
              },
              properties: {
                id: `${item.zipcode || ''}_${x}_${y}_${idx}`,
                label: fulltext,
                name: streetPart || fulltext,
                street: streetPart,
                postcode: item.zipcode || '',
                city: item.city || '',
              },
            };
          });
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    console.warn('[AddressAutocomplete] Erreur API Géoportail completion:', err);
  }

  // Fallback geocodage search
  try {
    const res = await fetch(
      `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&limit=6`,
      { signal }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.features)) {
        return data.features;
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    console.warn('[AddressAutocomplete] Erreur API Géoportail search:', err);
  }

  return [];
}

export function AddressAutocomplete({ value, onChange, onSelect, className, placeholder }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const isSelectedRef = useRef(false);
  const isUserTypingRef = useRef(false);

  // Sync internal query with external value (pas de recherche automatique si mise à jour externe)
  useEffect(() => {
    if (!isUserTypingRef.current) {
      setQuery(value || '');
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search logic with debounce : propositions Géoportail en direct pendant la saisie
  useEffect(() => {
    if (!isUserTypingRef.current || isSelectedRef.current) {
      return;
    }

    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const features = await fetchGeoportailCompletionFeatures(query, controller.signal);
        if (isUserTypingRef.current && !isSelectedRef.current) {
          setSuggestions(features);
          setIsOpen(features.length > 0);
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Address search error:', err);
        }
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelect = (feature) => {
    const props = feature?.properties || {};
    let label = '';
    if (props.housenumber && props.street) {
      label = `${props.housenumber} ${props.street}`.trim();
    } else if (props.street) {
      label = props.street.trim();
    } else if (props.name) {
      label = props.name.trim();
      if (props.postcode) label = label.replace(new RegExp(`\\b${props.postcode}\\b`, 'g'), '').trim();
      if (props.city) label = label.replace(new RegExp(`\\b${props.city}\\b`, 'gi'), '').trim();
    } else {
      label = props.label || '';
      if (props.postcode) label = label.replace(new RegExp(`\\b${props.postcode}\\b`, 'g'), '').trim();
    }
    label = label.replace(/[,\s]+$/, '').trim();

    isUserTypingRef.current = false;
    isSelectedRef.current = true;
    setQuery(label || props.name || props.label || '');
    setSuggestions([]);
    setIsOpen(false);
    onSelect(feature);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            isUserTypingRef.current = true;
            isSelectedRef.current = false;
            setQuery(e.target.value);
            onChange?.(e);
          }}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          className={className}
          placeholder={placeholder}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-[1001] w-full mt-1 bg-white border rounded-lg shadow-xl max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {suggestions.map((feat, idx) => (
            <button
              key={feat.properties?.id || idx}
              type="button"
              className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 transition-colors flex items-start gap-2.5 border-b last:border-b-0"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(feat);
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(feat);
              }}
            >
              <div className="mt-0.5 text-blue-500 shrink-0">
                <MapPin size={15} />
              </div>
              <div className="overflow-hidden">
                <div className="font-semibold text-xs text-gray-900 truncate">
                  {feat.properties?.label || feat.properties?.name}
                </div>
                {(feat.properties?.postcode || feat.properties?.city) && (
                  <div className="text-[11px] text-gray-500 truncate">
                    {feat.properties?.postcode} {feat.properties?.city}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
