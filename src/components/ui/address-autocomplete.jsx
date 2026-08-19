import React, { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { Search, MapPin, Loader2 } from 'lucide-react';

export function AddressAutocomplete({ value, onChange, onSelect, className, placeholder }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const isSelectedRef = useRef(false);

  // Sync internal query with external value
  useEffect(() => {
    setQuery(value || '');
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

  // Search logic with debounce
  useEffect(() => {
    // Ne pas chercher si l'utilisateur vient de cliquer sur une suggestion
    if (isSelectedRef.current) {
      return;
    }

    // Only search if query is long enough
    if (!query || query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        if (!isSelectedRef.current) {
          setSuggestions(data.features || []);
          if (data.features?.length > 0) {
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error("Address search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (feature) => {
    const label = feature.properties.name || feature.properties.label;
    isSelectedRef.current = true;
    setQuery(label);
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
            isSelectedRef.current = false;
            setQuery(e.target.value);
            onChange?.(e);
          }}
          onFocus={() => {
            if (!isSelectedRef.current && suggestions.length > 0) setIsOpen(true);
          }}
          className={className}
          placeholder={placeholder}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-[1001] w-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {suggestions.map((feat) => (
            <button
              key={feat.properties.id}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-start gap-3 border-b last:border-b-0"
              onClick={() => handleSelect(feat)}
            >
              <div className="mt-1 text-blue-500 shrink-0">
                <MapPin size={16} />
              </div>
              <div className="overflow-hidden">
                <div className="font-semibold text-sm text-gray-900 truncate">{feat.properties.name}</div>
                <div className="text-xs text-gray-500 truncate">{feat.properties.postcode} {feat.properties.city}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
