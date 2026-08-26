import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Loader2, MapPinned } from 'lucide-react';
import useSechoirStore from '@/stores/useSechoirStore.js';
import { ZONES_CLIMATIQUES, ZONES_SECHAGE } from '@/data/sechoirBatitechModels.js';

export default function Step1Location() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const address = useSechoirStore((state) => state.address);
  const addressLabel = useSechoirStore((state) => state.addressLabel);
  const setAddress = useSechoirStore((state) => state.setAddress);
  const zoneClimatique = useSechoirStore((state) => state.zoneClimatique);
  const zoneSechage = useSechoirStore((state) => state.zoneSechage);

  useEffect(() => {
    if (addressLabel && !query) {
      setQuery(addressLabel);
    }
  }, [addressLabel, query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (query.length < 3) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        setResults(data.features || []);
        setShowDropdown(true);
      } catch (error) {
        console.error('Error fetching addresses:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      // Only search if the query isn't exactly the selected address label
      if (query !== addressLabel) {
        fetchAddresses();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, addressLabel]);

  const handleSelectAddress = (feature) => {
    const { label, postcode, city } = feature.properties;
    const [longitude, latitude] = feature.geometry.coordinates;

    let departement = postcode.substring(0, 2);
    if (postcode.startsWith('20')) {
      departement = postcode <= '20190' ? '2A' : '2B';
    }

    const zc = ZONES_CLIMATIQUES[departement] || 'H1';
    const zs = ZONES_SECHAGE[departement] || 1;

    setAddress({
      address: label,
      addressLabel: label,
      latitude,
      longitude,
      departement,
      commune: city,
      codePostal: postcode,
      zoneClimatique: zc,
      zoneSechage: zs,
    });

    setQuery(label);
    setShowDropdown(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <MapPin className="text-amber-500 w-6 h-6" />
          Localisation & Implantation
        </h2>
        <p className="text-slate-300">
          Renseignez l'adresse du projet pour déterminer les zones climatiques et le gisement solaire.
        </p>
      </div>

      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
            placeholder="Saisissez une adresse..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </div>
        </div>

        <AnimatePresence>
          {showDropdown && results.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-10 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden"
            >
              {results.map((feature) => (
                <li
                  key={feature.properties.id}
                  onClick={() => handleSelectAddress(feature)}
                  className="px-4 py-3 hover:bg-slate-700/50 cursor-pointer flex items-start gap-3 transition-colors"
                >
                  <MapPinned className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-slate-200">{feature.properties.name}</div>
                    <div className="text-sm text-slate-400">
                      {feature.properties.postcode} {feature.properties.city}
                    </div>
                  </div>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {address && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8"
          >
            <div className="bg-slate-800/40 border border-blue-500/30 rounded-xl p-4 flex flex-col items-center justify-center gap-2 relative overflow-hidden group hover:border-blue-500/60 transition-colors">
              <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
              <span className="text-2xl" role="img" aria-label="Montagne">🏔️</span>
              <span className="text-sm text-slate-400 text-center">Zone Climatique CEE</span>
              <span className="text-xl font-bold text-blue-400">{zoneClimatique}</span>
            </div>

            <div className="bg-slate-800/40 border border-amber-500/30 rounded-xl p-4 flex flex-col items-center justify-center gap-2 relative overflow-hidden group hover:border-amber-500/60 transition-colors">
              <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors" />
              <span className="text-2xl" role="img" aria-label="Blé">🌾</span>
              <span className="text-sm text-slate-400 text-center">Zone Séchage</span>
              <span className="text-xl font-bold text-amber-400">Zone {zoneSechage}</span>
            </div>

            <div className="bg-slate-800/40 border border-emerald-500/30 rounded-xl p-4 flex flex-col items-center justify-center gap-2 relative overflow-hidden group hover:border-emerald-500/60 transition-colors">
              <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
              <span className="text-2xl" role="img" aria-label="Presse-papiers">📋</span>
              <span className="text-sm text-slate-400 text-center">Fiche CEE</span>
              <span className="text-xl font-bold text-emerald-400">AGRI-EQ-110</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
