import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Loader2, MapPinned, X, Building2, CheckCircle2 } from 'lucide-react';
import useSechoirStore from '@/stores/useSechoirStore.js';
import { BATITECH_MODELS, ZONES_CLIMATIQUES, ZONES_SECHAGE, getRegionForDepartment } from '@/data/sechoirBatitechModels.js';

export default function Step1Location() {
  // Store — Localisation
  const address = useSechoirStore((state) => state.address);
  const addressLabel = useSechoirStore((state) => state.addressLabel);
  const departement = useSechoirStore((state) => state.departement);
  const zoneClimatique = useSechoirStore((state) => state.zoneClimatique);
  const zoneSechage = useSechoirStore((state) => state.zoneSechage);
  const setAddress = useSechoirStore((state) => state.setAddress);

  // Store — Modèle
  const selectedModelId = useSechoirStore((state) => state.selectedModelId) || 'BT-3.1.15';
  const setModel = useSechoirStore((state) => state.setModel);

  const [query, setQuery] = useState(addressLabel || address || '');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const isUserTypingRef = useRef(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!useSechoirStore.getState().selectedModelId) {
      setModel('BT-3.1.15');
    }
  }, [setModel]);

  // Synchroniser la valeur de l'input si le store change de l'extérieur sans déclencher la recherche
  useEffect(() => {
    if (addressLabel || address) {
      isUserTypingRef.current = false;
      setQuery(addressLabel || address);
    }
  }, [addressLabel, address]);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recherche BAN uniquement lorsque l'utilisateur tape du texte
  useEffect(() => {
    if (!isUserTypingRef.current) {
      return;
    }

    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=6`
        );
        const data = await response.json();
        if (data && data.features) {
          setResults(data.features);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error('Erreur BAN API:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleInputChange = (e) => {
    isUserTypingRef.current = true;
    const val = e.target.value;
    setQuery(val);
    if (!val) {
      setResults([]);
      setShowDropdown(false);
      setAddress({
        address: '',
        label: '',
        latitude: null,
        longitude: null,
        departement: '',
        commune: '',
        codePostal: '',
        zoneClimatique: '',
        zoneSechage: '',
      });
    }
  };

  const handleClear = () => {
    isUserTypingRef.current = false;
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setAddress({
      address: '',
      label: '',
      latitude: null,
      longitude: null,
      departement: '',
      commune: '',
      codePostal: '',
      zoneClimatique: '',
      zoneSechage: '',
    });
  };

  const handleSelectAddress = (feature) => {
    isUserTypingRef.current = false;
    const props = feature.properties;
    const coords = feature.geometry.coordinates; // [lng, lat]
    const postcode = props.postcode || '';
    const city = props.city || '';
    const label = props.label || props.name;

    let dept = '';
    if (postcode.startsWith('20')) {
      dept = props.citycode?.startsWith('2A') ? '2A' : '2B';
    } else if (postcode.length >= 2) {
      dept = postcode.substring(0, 2);
    }

    const zc = ZONES_CLIMATIQUES[dept] || 'H1';
    const zs = ZONES_SECHAGE[dept] || 1;

    setAddress({
      address: label,
      label: label,
      latitude: coords[1],
      longitude: coords[0],
      departement: dept,
      commune: city,
      codePostal: postcode,
      zoneClimatique: zc,
      zoneSechage: zs,
    });

    setQuery(label);
    setResults([]);
    setShowDropdown(false);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const regionName = getRegionForDepartment(departement);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ═══ COLONNE GAUCHE (5 colonnes) : LOCALISATION & BADGES ═══ */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 shadow-lg space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                <MapPin className="text-amber-400 w-6 h-6 shrink-0" />
                Localisation &amp; Implantation
              </h2>
              <p className="text-xs text-slate-300">
                Renseignez l'adresse du projet pour déterminer les zones climatiques et le productible.
              </p>
            </div>

            {/* Champ adresse & autocomplétion */}
            <div className="relative z-50" ref={dropdownRef}>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onFocus={() => { if (isUserTypingRef.current && results.length > 0) setShowDropdown(true); }}
                  placeholder="Saisissez une adresse ou commune..."
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-2xl py-3 pl-11 pr-10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium shadow-inner"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Search className="w-4 h-4" />}
                </div>

                {query && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Effacer l'adresse"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown BAN en surimposition */}
              <AnimatePresence>
                {showDropdown && results.length > 0 && (
                  <motion.ul
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute z-[9999] left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-800"
                  >
                    {results.map((feature) => (
                      <li
                        key={feature.properties.id || feature.properties.label}
                        onClick={() => handleSelectAddress(feature)}
                        className="px-4 py-3 hover:bg-slate-800/90 cursor-pointer flex items-start gap-3 transition-colors text-left"
                      >
                        <MapPinned className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-slate-100 font-bold text-sm truncate">{feature.properties.name || feature.properties.label}</div>
                          <div className="text-xs text-slate-400">
                            {feature.properties.postcode} {feature.properties.city}
                          </div>
                        </div>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* 4 Badges géographiques : Région, Zone CEE, Séchage, Fiche CEE */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center shadow-inner">
                <span className="text-lg" role="img" aria-label="Région">🏛️</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Région</span>
                <span className="text-[11px] font-black text-purple-300 leading-tight mt-0.5" title={regionName}>
                  {regionName}
                </span>
              </div>

              <div className="bg-slate-900/80 border border-blue-500/30 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center shadow-inner">
                <span className="text-lg" role="img" aria-label="Montagne">🏔️</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Zone CEE</span>
                <span className="text-sm font-black text-blue-400 mt-0.5">{zoneClimatique || 'H1'}</span>
              </div>

              <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center shadow-inner">
                <span className="text-lg" role="img" aria-label="Blé">🌾</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Séchage</span>
                <span className="text-sm font-black text-amber-400 mt-0.5">Zone {zoneSechage || 1}</span>
              </div>

              <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center shadow-inner">
                <span className="text-lg" role="img" aria-label="Fiche CEE">📋</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Fiche CEE</span>
                <span className="text-[10px] font-black text-emerald-400 mt-0.5">AGRI-EQ-110</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ COLONNE DROITE (7 colonnes) : MODÈLES EN PILE VERTICALE ═══ */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 shadow-lg space-y-3">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                <Building2 className="text-amber-400 w-6 h-6 shrink-0" />
                Modèle BatiTech®
              </h2>
              <p className="text-xs text-slate-300">
                Sélectionnez la configuration de séchoir adaptée à votre exploitation.
              </p>
            </div>

            {/* 3 Cartes de modèles l'un en dessous de l'autre */}
            <div className="flex flex-col gap-3 pt-1">
              {Object.entries(BATITECH_MODELS).map(([modelId, model]) => {
                const isSelected = selectedModelId === modelId;
                const pKwc = model.puissanceKwc ? Number(model.puissanceKwc) : 30.15;

                return (
                  <div
                    key={modelId}
                    onClick={() => setModel(modelId)}
                    className={`
                      cursor-pointer rounded-2xl p-4 transition-all duration-200 border relative
                      ${isSelected
                        ? 'ring-2 ring-amber-400 bg-slate-900/90 border-amber-400/50 shadow-lg shadow-amber-400/15'
                        : 'bg-slate-900/40 border-slate-700/70 hover:border-amber-400/40 hover:bg-slate-900/60'}
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-black bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 uppercase tracking-wider">
                            {model.zones} {model.zones > 1 ? 'zones' : 'zone'}
                          </span>
                          <h3 className="text-base font-black text-white">{model.name}</h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {model.description}
                        </p>
                      </div>

                      <div className="text-right flex items-center gap-2.5 shrink-0">
                        <div>
                          <span className="text-[11px] text-slate-400 uppercase font-semibold block">Investissement</span>
                          <span className="text-base font-black text-white">{formatCurrency(model.investissementBrut)} HT</span>
                        </div>
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-600 shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* Données techniques en ligne */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800 text-xs text-slate-300">
                      <div>
                        <span className="text-slate-500 font-medium block text-[11px]">Puissance</span>
                        <span className="font-bold text-white">{pKwc.toFixed(2)} kWc</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block text-[11px]">Modules</span>
                        <span className="font-bold text-white">{model.nbModules} Cogen'Air®</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block text-[11px]">Dimensions</span>
                        <span className="font-bold text-amber-400">{model.dimensions}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
