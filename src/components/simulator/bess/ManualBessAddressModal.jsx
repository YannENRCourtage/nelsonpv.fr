import React, { useState, useEffect, useRef } from 'react';
import {
  X, Search, MapPin, Loader2, ArrowLeft, Navigation,
  Building, CheckCircle2, AlertCircle, Zap, Compass
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast.js';
import {
  fetchCadastralParcel,
  fetchParcelOwners,
  detectGroundTransformers
} from '@/services/bessProspectingGisService.js';

export default function ManualBessAddressModal({
  isOpen,
  onClose,
  onSelectSite,
  currentSite
}) {
  const [activeTab, setActiveTab] = useState('address'); // 'address' | 'gps'
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingBAN, setIsSearchingBAN] = useState(false);
  const [isLoadingQualification, setIsLoadingQualification] = useState(false);
  const [qualificationStep, setQualificationStep] = useState('');

  // GPS manual inputs
  const [gpsLat, setGpsLat] = useState(currentSite?.lat ? String(currentSite.lat) : '');
  const [gpsLng, setGpsLng] = useState(currentSite?.lng ? String(currentSite.lng) : '');

  const searchTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSuggestions([]);
      setIsLoadingQualification(false);
      setQualificationStep('');
      if (currentSite?.lat && currentSite?.lng) {
        setGpsLat(String(currentSite.lat));
        setGpsLng(String(currentSite.lng));
      }
    }
  }, [isOpen, currentSite]);

  // Recherche BAN débouncée
  useEffect(() => {
    if (!isTypingRef.current) return;
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsSearchingBAN(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingBAN(true);
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=6`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.features || []);
        }
      } catch (err) {
        console.warn('[ManualBessAddress] Erreur BAN:', err);
      } finally {
        setIsSearchingBAN(false);
      }
    }, 280);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [query]);

  // Qualification complète du site sélectionné
  const qualifyAndApplySite = async (lat, lng, addressInfo = {}) => {
    setIsLoadingQualification(true);
    setQualificationStep('Recherche de la parcelle cadastrale (IGN)...');

    try {
      // 1. Parcelle cadastrale
      const parcel = await fetchCadastralParcel(lat, lng);
      setQualificationStep('Identification du propriétaire foncier (DGFiP MAJIC)...');

      // 2. Propriétaire foncier si parcelle trouvée
      let ownerName = 'Propriétaire Foncier';
      if (parcel?.idu) {
        try {
          const owners = await fetchParcelOwners(parcel.idu);
          if (owners && owners.length > 0 && owners[0].denomination) {
            ownerName = owners[0].denomination;
          }
        } catch (e) {
          console.warn('[ManualBessAddress] Erreur recherche propriétaire:', e);
        }
      }

      // 3. Détection réseau HTA Enedis dans un rayon de 1 km
      setQualificationStep('Vérification des lignes HTA et postes Enedis...');
      let distSouterrain = 1.1;
      let distAerien = 850.0;
      try {
        const delta = 0.008; // ~800m
        const bbox = {
          minLat: lat - delta,
          minLng: lng - delta,
          maxLat: lat + delta,
          maxLng: lng + delta
        };
        const detection = await detectGroundTransformers(bbox);
        if (detection?.groundTransformers?.length > 0) {
          let closest = null;
          let minDist = Infinity;
          for (const t of detection.groundTransformers) {
            const d = Math.hypot(t.lat - lat, t.lng - lng);
            if (d < minDist) {
              minDist = d;
              closest = t;
            }
          }
          if (closest) {
            distSouterrain = closest.distSouterrain || 1.1;
            distAerien = closest.distAerien || 850.0;
          }
        }
      } catch (e) {
        console.warn('[ManualBessAddress] Erreur analyse Enedis:', e);
      }

      const commune = addressInfo.city || addressInfo.nomCommune || (parcel ? parcel.nomCommune : 'Commune');
      const postalCode = addressInfo.postcode || (parcel ? parcel.codeCommune : '00000');
      const departement = addressInfo.departement || (postalCode ? postalCode.substring(0, 2) : '10');
      const streetAddress = addressInfo.name || addressInfo.label || addressInfo.street || `${commune}`;

      const newSite = {
        name: `Centrale BESS — ${commune}`,
        address: streetAddress,
        commune,
        postalCode,
        departement,
        lat: Number(lat),
        lng: Number(lng),
        parcelId: parcel?.idu || `${postalCode}000A0001`,
        section: parcel?.section || '0A',
        numero: parcel?.numero || '0001',
        parcelGeometry: parcel?.geometry || null,
        distSouterrain,
        distAerien,
        ownerName,
        loyerAnnuel: 2000,
        dureeBail: 20,
        surface: 20,
        puissance: 500,
        capacite: 1044
      };

      onSelectSite(newSite);
      toast({
        title: 'Nouvelle adresse BESS sélectionnée',
        description: `${streetAddress}, ${postalCode} ${commune} ${parcel ? `(Parcelle ${parcel.section} ${parcel.numero})` : ''}`,
        duration: 3500
      });
      onClose();
    } catch (err) {
      console.error('[ManualBessAddress] Erreur qualification:', err);
      toast({
        title: 'Erreur de qualification',
        description: "Impossible d'analyser cette adresse. Vérifiez la saisie.",
        variant: 'destructive'
      });
    } finally {
      setIsLoadingQualification(false);
      setQualificationStep('');
    }
  };

  const handleSelectFeature = (feat) => {
    if (!feat?.geometry?.coordinates) return;
    const [lng, lat] = feat.geometry.coordinates;
    const props = feat.properties || {};

    qualifyAndApplySite(lat, lng, {
      name: props.name || props.label,
      label: props.label,
      street: props.street,
      city: props.city,
      postcode: props.postcode,
      departement: props.postcode ? props.postcode.substring(0, 2) : ''
    });
  };

  const handleValidateGps = () => {
    const lat = parseFloat(gpsLat.replace(',', '.'));
    const lng = parseFloat(gpsLng.replace(',', '.'));

    if (isNaN(lat) || isNaN(lng) || lat < 41 || lat > 52 || lng < -6 || lng > 10) {
      toast({
        title: 'Coordonnées GPS invalides',
        description: 'Veuillez saisir des coordonnées valides en France métropolitaine (ex: 48.2893, 4.0020).',
        variant: 'destructive'
      });
      return;
    }

    qualifyAndApplySite(lat, lng, {
      name: `Site GPS [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
      city: 'Localisation GPS',
      postcode: '',
      departement: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER MODALE */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Revenir à la simulation"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  <MapPin className="w-5 h-5 text-amber-400" />
                  Saisir une nouvelle adresse manuellement
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Recherchez une adresse en France pour implanter la centrale BESS et charger les lignes HTA
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ONGLETS : RECHERCHE ADRESSE BAN / COORDONNÉES GPS */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 px-4 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black rounded-t-xl transition-all cursor-pointer border-b-2 ${
              activeTab === 'address'
                ? 'text-amber-400 border-amber-400 bg-slate-900'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Adresse ou Commune (BAN)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gps')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black rounded-t-xl transition-all cursor-pointer border-b-2 ${
              activeTab === 'gps'
                ? 'text-amber-400 border-amber-400 bg-slate-900'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Coordonnées GPS Directes</span>
          </button>
        </div>

        {/* CORPS DE LA MODALE */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* ÉTAT DE CHARGEMENT / ANALYSE FONCIÈRE */}
          {isLoadingQualification && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 animate-pulse">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-black text-amber-300">Analyse foncière et réseau en cours...</div>
                <div className="text-[11px] text-amber-200/80 truncate">{qualificationStep}</div>
              </div>
            </div>
          )}

          {/* ONGLET 1 : ADRESSE BAN */}
          {activeTab === 'address' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    isTypingRef.current = true;
                    setQuery(e.target.value);
                  }}
                  placeholder="Ex: 77 Avenue Général Leclerc, La Rivière-de-Corps ou 10210..."
                  autoFocus
                  disabled={isLoadingQualification}
                  className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setSuggestions([]);
                    }}
                    className="absolute right-3 top-3 p-1 rounded-md text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {isSearchingBAN && (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin absolute right-10 top-3.5" />
                )}
              </div>

              {/* LISTE DES SUGGESTIONS BAN */}
              {suggestions.length > 0 && (
                <div className="space-y-1.5 max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-1.5 shadow-inner">
                  {suggestions.map((feat, idx) => {
                    const props = feat.properties || {};
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectFeature(feat)}
                        disabled={isLoadingQualification}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-slate-800/80 active:bg-slate-800 border border-transparent hover:border-slate-700 transition-all flex items-start gap-2.5 group cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-amber-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                            {props.name || props.label}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {props.postcode} {props.city} {props.context ? `• ${props.context}` : ''}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* EXEMPLES RAPIDES EN 1 CLIC */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-400 mb-2">Exemples rapides :</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '77 AV GENERAL LECLERC, 10210 La Rivière-de-Corps', lat: 48.2893154, lng: 4.0019689, city: 'La Rivière-de-Corps', postcode: '10210' },
                    { label: 'Route de Nontron, 24310 Nontron', lat: 45.529, lng: 0.665, city: 'Nontron', postcode: '24300' },
                    { label: 'Zone Industrielle, 33000 Bordeaux', lat: 44.8378, lng: -0.5792, city: 'Bordeaux', postcode: '33000' }
                  ].map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        qualifyAndApplySite(ex.lat, ex.lng, {
                          name: ex.label,
                          city: ex.city,
                          postcode: ex.postcode
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {ex.city}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 2 : GPS DIRECT */}
          {activeTab === 'gps' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Latitude (WGS84)</label>
                  <input
                    type="text"
                    value={gpsLat}
                    onChange={(e) => setGpsLat(e.target.value)}
                    placeholder="Ex: 48.289315"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Longitude (WGS84)</label>
                  <input
                    type="text"
                    value={gpsLng}
                    onChange={(e) => setGpsLng(e.target.value)}
                    placeholder="Ex: 4.001968"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleValidateGps}
                disabled={isLoadingQualification || !gpsLat || !gpsLng}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4 text-black" />
                <span>Localiser et Analyser ce Point GPS</span>
              </button>
            </div>
          )}

        </div>

        {/* PIED DE MODALE */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold transition-colors cursor-pointer"
          >
            ← Revenir à la simulation
          </button>

          <span className="text-[11px] text-slate-400">
            Intégration API BAN &bull; IGN Cadastre &bull; Enedis Open Data
          </span>
        </div>

      </div>
    </div>
  );
}
