import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, ArrowLeft, Navigation, Compass, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast.js';
import {
  fetchCadastralParcel,
  fetchParcelOwners
} from '@/services/bessProspectingGisService.js';

/**
 * BessAddressSearchPanel — Écran intégré (in-page) de saisie d'adresse pour la Simulation BESS.
 * Remplace la modale pop-up flottante conformément à la demande de l'utilisateur.
 * Sans exemples rapides, avec autocomplétion BAN et saisie GPS directe.
 */
export default function BessAddressSearchPanel({
  onSelectAddress,
  onCancel,
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
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=7`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.features || []);
        }
      } catch (err) {
        console.warn('[BessAddressSearchPanel] Erreur BAN:', err);
      } finally {
        setIsSearchingBAN(false);
      }
    }, 250);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [query]);

  // Qualification complète de l'adresse sélectionnée
  const qualifyAndApply = async (lat, lng, addressInfo = {}) => {
    setIsLoadingQualification(true);
    setQualificationStep('Recherche de la parcelle cadastrale (IGN PCI)...');

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
          console.warn('[BessAddressSearchPanel] Erreur propriétaire:', e);
        }
      }

      const commune = addressInfo.city || (parcel ? parcel.nomCommune : 'Commune');
      const postalCode = addressInfo.postcode || (parcel ? parcel.codeCommune : '');
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
        parcelId: parcel?.idu || '',
        section: parcel?.section || '0A',
        numero: parcel?.numero || '0001',
        parcelGeometry: parcel?.geometry || null,
        ownerName,
        loyerAnnuel: 2000,
        dureeBail: 20,
        surface: 20,
        puissance: 500,
        capacite: 1044
      };

      onSelectAddress(newSite);
      toast({
        title: 'Adresse sélectionnée',
        description: `${streetAddress}, ${postalCode} ${commune}`,
        duration: 3000
      });
    } catch (err) {
      console.error('[BessAddressSearchPanel] Erreur qualification:', err);
      toast({
        title: 'Erreur',
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

    qualifyAndApply(lat, lng, {
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
        description: 'Veuillez saisir des coordonnées valides en France métropolitaine.',
        variant: 'destructive'
      });
      return;
    }

    qualifyAndApply(lat, lng, {
      name: `Point GPS [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
      city: 'Localisation GPS',
      postcode: '',
      departement: ''
    });
  };

  return (
    <div className="flex flex-col justify-between h-full bg-slate-900/90 border border-amber-500/40 rounded-xl p-3.5 sm:p-4 shadow-xl overflow-hidden animate-in fade-in duration-150">
      
      <div className="space-y-3 min-h-0 flex-1 flex flex-col">
        {/* ENTÊTE DE LA PAGE DE SAISIE */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight">
                Saisie d'une nouvelle adresse
              </h2>
              <p className="text-[11px] text-slate-400">
                Implantation BESS &amp; détection des réseaux Enedis
              </p>
            </div>
          </div>

          {currentSite && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
              title="Annuler et revenir à la simulation courante"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Annuler</span>
            </button>
          )}
        </div>

        {/* ONGLETS : ADRESSE BAN / GPS DIRECT */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/60 rounded-lg p-1 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'address'
                ? 'bg-amber-500 text-black shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Adresse ou Commune (BAN)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gps')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'gps'
                ? 'bg-amber-500 text-black shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Coordonnées GPS</span>
          </button>
        </div>

        {/* ÉTAT DE CHARGEMENT */}
        {isLoadingQualification && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 animate-pulse shrink-0">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-amber-300">Analyse foncière en cours...</div>
              <div className="text-[10.5px] text-amber-200/80 truncate">{qualificationStep}</div>
            </div>
          </div>
        )}

        {/* ONGLET 1 : RECHERCHE BAN */}
        {activeTab === 'address' && (
          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  isTypingRef.current = true;
                  setQuery(e.target.value);
                }}
                placeholder="Ex: 4 Rue de la Madelon, 13800 Istres..."
                autoFocus
                disabled={isLoadingQualification}
                className="w-full pl-9 pr-9 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSuggestions([]);
                  }}
                  className="absolute right-2.5 top-2.5 p-1 rounded-md text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {isSearchingBAN && (
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin absolute right-8 top-3" />
              )}
            </div>

            {/* LISTE DES RÉSULTATS BAN */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
              {suggestions.length > 0 ? (
                suggestions.map((feat, idx) => {
                  const props = feat.properties || {};
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectFeature(feat)}
                      disabled={isLoadingQualification}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-slate-800 active:bg-slate-750 border border-transparent hover:border-slate-700 transition-all flex items-start gap-2.5 group cursor-pointer"
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
                })
              ) : query.trim().length >= 2 && !isSearchingBAN ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Aucune adresse trouvée pour cette recherche
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-1.5 h-full">
                  <Search className="w-6 h-6 text-slate-600" />
                  <span>Saisissez une adresse postale ou le nom d'une commune pour afficher les résultats</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ONGLET 2 : GPS DIRECT */}
        {activeTab === 'gps' && (
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Latitude (WGS84)</label>
              <input
                type="text"
                value={gpsLat}
                onChange={(e) => setGpsLat(e.target.value)}
                placeholder="Ex: 43.51525"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Longitude (WGS84)</label>
              <input
                type="text"
                value={gpsLng}
                onChange={(e) => setGpsLng(e.target.value)}
                placeholder="Ex: 4.98690"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleValidateGps}
              disabled={isLoadingQualification || !gpsLat || !gpsLng}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4 text-black" />
              <span>Localiser et Analyser ce Point GPS</span>
            </button>
          </div>
        )}
      </div>

      {/* PIED DE CARTE */}
      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between shrink-0">
        <span>Base Adresse Nationale (BAN) &bull; IGN Cadastre</span>
        {currentSite && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-amber-400 hover:underline cursor-pointer"
          >
            ← Revenir au site actuel
          </button>
        )}
      </div>

    </div>
  );
}
