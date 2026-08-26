import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Loader2, MapPinned, X } from 'lucide-react';
import useSechoirStore from '@/stores/useSechoirStore.js';
import { ZONES_CLIMATIQUES, ZONES_SECHAGE } from '@/data/sechoirBatitechModels.js';

export default function Step1Location() {
  const address = useSechoirStore((state) => state.address);
  const addressLabel = useSechoirStore((state) => state.addressLabel);
  const setAddress = useSechoirStore((state) => state.setAddress);
  const zoneClimatique = useSechoirStore((state) => state.zoneClimatique);
  const zoneSechage = useSechoirStore((state) => state.zoneSechage);

  const [query, setQuery] = useState(addressLabel || address || '');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Synchroniser la valeur de recherche au montage si déjà présente dans le store
  useEffect(() => {
    if (addressLabel && !query) {
      setQuery(addressLabel);
    }
  }, []);

  // Fermer la liste déroulante au clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recherche BAN avec debounce
  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    // Ne pas relancer la recherche si la query est exactement le label déjà sélectionné
    if (query === addressLabel) {
      return;
    }

    const fetchAddresses = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query.trim())}&limit=6`);
        const data = await response.json();
        setResults(data.features || []);
        setShowDropdown(true);
      } catch (error) {
        console.error('Erreur autocomplétion adresse:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(fetchAddresses, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, addressLabel]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val || val.trim() === '') {
      setAddress({
        address: '',
        addressLabel: '',
        latitude: null,
        longitude: null,
        departement: '',
        commune: '',
        codePostal: '',
        zoneClimatique: '',
        zoneSechage: '',
      });
      setResults([]);
      setShowDropdown(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setAddress({
      address: '',
      addressLabel: '',
      latitude: null,
      longitude: null,
      departement: '',
      commune: '',
      codePostal: '',
      zoneClimatique: '',
      zoneSechage: '',
    });
    setResults([]);
    setShowDropdown(false);
  };

  const handleSelectAddress = (feature) => {
    const { label, postcode, city } = feature.properties;
    const [longitude, latitude] = feature.geometry.coordinates;

    let departement = postcode ? postcode.substring(0, 2) : '32';
    if (postcode && postcode.startsWith('20')) {
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
      className="space-y-6 relative"
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

      <div className="relative z-40" ref={dropdownRef}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
            placeholder="Saisissez une adresse ou une commune..."
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-3.5 pl-12 pr-10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-inner text-sm font-medium"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin text-amber-400" /> : <Search className="w-5 h-5" />}
          </div>

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              title="Effacer l'adresse"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Liste déroulante des résultats BAN en surimposition absolue */}
        <AnimatePresence>
          {showDropdown && results.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -5, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.99 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-800"
            >
              {results.map((feature) => (
                <li
                  key={feature.properties.id || feature.properties.label}
                  onClick={() => handleSelectAddress(feature)}
                  className="px-4 py-3 hover:bg-slate-800/90 cursor-pointer flex items-start gap-3 transition-colors text-left"
                >
                  <MapPinned className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-slate-100 font-medium text-sm truncate">{feature.properties.name || feature.properties.label}</div>
                    <div className="text-xs text-slate-400">
                      {feature.properties.postcode} {feature.properties.city} {feature.properties.context ? `— ${feature.properties.context}` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* Badges d'information sur la zone géographique */}
      <AnimatePresence>
        {address && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 z-10 relative"
          >
            <div className="bg-slate-800/60 border border-blue-500/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 relative overflow-hidden group hover:border-blue-500/60 transition-colors shadow-lg">
              <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
              <span className="text-2xl" role="img" aria-label="Montagne">🏔️</span>
              <span className="text-xs font-semibold text-slate-400 text-center uppercase tracking-wider">Zone Climatique CEE</span>
              <span className="text-xl font-black text-blue-400">{zoneClimatique || 'H1'}</span>
            </div>

            <div className="bg-slate-800/60 border border-amber-500/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 relative overflow-hidden group hover:border-amber-500/60 transition-colors shadow-lg">
              <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors" />
              <span className="text-2xl" role="img" aria-label="Blé">🌾</span>
              <span className="text-xs font-semibold text-slate-400 text-center uppercase tracking-wider">Zone Séchage</span>
              <span className="text-xl font-black text-amber-400">Zone {zoneSechage || 1}</span>
            </div>

            <div className="bg-slate-800/60 border border-emerald-500/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 relative overflow-hidden group hover:border-emerald-500/60 transition-colors shadow-lg">
              <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
              <span className="text-2xl" role="img" aria-label="Presse-papiers">📋</span>
              <span className="text-xs font-semibold text-slate-400 text-center uppercase tracking-wider">Fiche CEE</span>
              <span className="text-xl font-black text-emerald-400">AGRI-EQ-110</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
