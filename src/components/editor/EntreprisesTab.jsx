import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search, X, SlidersHorizontal, RotateCcw, Building2, MapPin,
  ExternalLink, Copy, Check, ChevronDown, ChevronUp, Layers,
  Compass, Loader2, FileText, CheckCircle2, ShieldAlert,
  ArrowRight, Landmark, Navigation
} from 'lucide-react';
import {
  getSireliumPins,
  getSireliumClusters,
  getSireliumEntreprise,
  searchSirelium
} from '../../services/SireliumService';

// Icônes personnalisées SVG Leaflet style Sirélium
function createBuildingIcon(isSelected = false, count = 1) {
  const bg = isSelected ? '#ea580c' : '#059669'; // Orange si sélectionné, vert émeraude pour actif
  const shadow = isSelected ? '0 0 0 3px rgba(234, 88, 12, 0.35), 0 4px 6px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.2)';
  const svgBuilding = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2"/>
      <path d="M10 6h4"/>
      <path d="M10 10h4"/>
      <path d="M10 14h4"/>
      <path d="M10 18h4"/>
    </svg>
  `;

  return L.divIcon({
    className: 'sirelium-pin-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background-color: ${bg};
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: ${shadow};
        border: 2px solid #ffffff;
        cursor: pointer;
        transition: transform 0.15s ease, background-color 0.15s ease;
      ">
        ${svgBuilding}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
}

function createClusterIcon(count) {
  const displayCount = count >= 1000 ? `${(count / 1000).toFixed(0)}k` : count;
  return L.divIcon({
    className: 'sirelium-cluster-marker',
    html: `
      <div style="
        min-width: 30px;
        height: 30px;
        padding: 0 6px;
        border-radius: 15px;
        background-color: #2563eb;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 11px;
        box-shadow: 0 3px 6px rgba(37, 99, 235, 0.35);
        border: 2px solid #ffffff;
        cursor: pointer;
      ">
        ${displayCount}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
}

function createProjectMarkerIcon() {
  return L.divIcon({
    className: 'sirelium-project-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-color: #dc2626;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.25), 0 4px 10px rgba(0,0,0,0.3);
        border: 2px solid #ffffff;
        animation: pulse 2s infinite;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="m12 8 4 4-4 4M8 12h8"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  });
}

// Contrôleur dynamique de carte pour écouter le pan/zoom et charger les pins
function MapBoundsListener({ onBoundsChange }) {
  const map = useMap();

  const handleUpdate = useCallback(() => {
    const b = map.getBounds();
    const zoom = map.getZoom();
    onBoundsChange({
      west: b.getWest(),
      south: b.getSouth(),
      east: b.getEast(),
      north: b.getNorth()
    }, zoom);
  }, [map, onBoundsChange]);

  useMapEvents({
    moveend: handleUpdate,
    zoomend: handleUpdate
  });

  useEffect(() => {
    handleUpdate();
  }, [handleUpdate]);

  return null;
}

export default function EntreprisesTab({ project, onSelectClient }) {
  // Coordonnées de départ résolues à partir du projet
  const projectCoords = useMemo(() => {
    let lat = Number(project?.lat);
    let lng = Number(project?.lng);
    if ((!lat || !lng || isNaN(lat) || isNaN(lng)) && project?.gps) {
      const parts = String(project.gps).split(',').map(v => Number(v.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] !== 0) {
        lat = parts[0];
        lng = parts[1];
      }
    }
    // Coordonnées par défaut (ex: Oregue 64120 / Bergerac 24)
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      lat = 44.688818;
      lng = 0.854884;
    }
    return [lat, lng];
  }, [project]);

  const mapRef = useRef(null);

  // États des filtres (fidèle à sirelium.fr)
  const [showFilters, setShowFilters] = useState(true);
  const [typeEtab, setTypeEtab] = useState('all'); // 'all', 'siege', 'others'
  const [statutUl, setStatutUl] = useState('active'); // 'all', 'active', 'sommeil', 'cessation', 'cessee'
  const [statutEtab, setStatutEtab] = useState('active'); // 'all', 'active', 'ferme'
  const [activeSection, setActiveSection] = useState(null); // Accordion ouvert

  // Fond de carte actif
  const [baseMap, setBaseMap] = useState('carto_voyager'); // 'carto_voyager', 'satellite', 'osm'
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Recherche textuelle
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Données cartographiques
  const [pins, setPins] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(16);

  // Fiche entreprise ouverte à droite
  const [selectedSiren, setSelectedSiren] = useState(null);
  const [selectedSiret, setSelectedSiret] = useState(null);
  const [ficheData, setFicheData] = useState(null);
  const [isLoadingFiche, setIsLoadingFiche] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [adoptedClient, setAdoptedClient] = useState(false);

  // Debounce pour le chargement des pins sur la carte
  const fetchTimeoutRef = useRef(null);

  const handleBoundsChange = useCallback((bounds, zoom) => {
    setCurrentZoom(zoom);
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);

    fetchTimeoutRef.current = setTimeout(async () => {
      setIsLoadingPins(true);
      try {
        const filters = {
          statut_ul: statutUl === 'all' ? '' : statutUl,
          statut_etab: statutEtab === 'all' ? '' : statutEtab,
          est_siege: typeEtab === 'siege' ? 1 : (typeEtab === 'others' ? 0 : '')
        };

        if (zoom >= 14) {
          const res = await getSireliumPins(bounds, filters);
          setPins(res.features || []);
          setClusters([]);
        } else {
          const clRes = await getSireliumClusters(bounds, zoom, filters);
          setClusters(clRes.features || []);
          setPins([]);
        }
      } catch (err) {
        console.error('[EntreprisesTab] Erreur chargement pins:', err);
      } finally {
        setIsLoadingPins(false);
      }
    }, 280);
  }, [statutUl, statutEtab, typeEtab]);

  // Chargement de la fiche entreprise lors de la sélection
  const handleSelectEstablishment = useCallback(async (siren, siret = null) => {
    if (!siren) return;
    setSelectedSiren(siren);
    setSelectedSiret(siret);
    setIsLoadingFiche(true);
    setAdoptedClient(false);

    try {
      const data = await getSireliumEntreprise(siren);
      setFicheData(data);
    } catch (err) {
      console.error('[EntreprisesTab] Erreur chargement fiche:', err);
    } finally {
      setIsLoadingFiche(false);
    }
  }, []);

  // Recherche en temps réel
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchSirelium(searchQuery);
        setSearchResults(results);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('[EntreprisesTab] Erreur recherche:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Action de recentrage sur le projet
  const handleRecenterProject = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.flyTo(projectCoords, 16, { duration: 1.2 });
    }
  }, [projectCoords]);

  // Copier dans le presse-papier avec feedback visuel
  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Renseigner automatiquement comme client / demandeur dans le projet Nelson
  const handleAdoptClient = () => {
    if (!ficheData?.ul) return;
    const ul = ficheData.ul;
    if (onSelectClient) {
      onSelectClient({
        nom_raison_sociale: ul.nom_raison_sociale,
        siren: ul.siren,
        siret: selectedSiret || ul.siret_siege,
        adresse_complete_ul: ul.adresse_complete_ul ? `${ul.adresse_complete_ul}, ${ul.code_postal_ul || ''} ${ul.commune_ul || ''}`.trim() : '',
        code_postal: ul.code_postal_ul,
        commune: ul.commune_ul,
        code_naf: ul.code_naf_ul
      });
    }
    setAdoptedClient(true);
  };

  // URLs des tuiles cartographiques
  const tileUrl = useMemo(() => {
    if (baseMap === 'satellite') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    if (baseMap === 'osm') {
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
    // CartoDB Voyager (défaut Sirelium)
    return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  }, [baseMap]);

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[680px] bg-slate-100 flex overflow-hidden font-sans border-t border-slate-300">
      
      {/* ========================================================= */}
      {/* 1. PANNEAU GAUCHE : FILTRES (STYLE SIRELIUM)               */}
      {/* ========================================================= */}
      <div className={`transition-all duration-300 ease-in-out bg-slate-900 text-slate-100 flex flex-col z-20 shadow-2xl border-r border-slate-800 ${
        showFilters ? 'w-80 min-w-[320px]' : 'w-0 min-w-0 -translate-x-full overflow-hidden'
      }`}>
        {/* Header Filtres */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-400" />
            <h2 className="font-bold text-sm tracking-wide text-white uppercase">Filtres</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setTypeEtab('all');
                setStatutUl('active');
                setStatutEtab('active');
              }}
              title="Réinitialiser les filtres"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              title="Fermer le panneau filtres"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Corps des filtres scrollable */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs select-none">
          {/* Section Filtres Rapides */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
              Filtres rapides
            </div>

            {/* Type d'établissement */}
            <div className="mb-3">
              <label className="text-[11px] font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                Type d'établissement
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {[
                  { id: 'all', label: 'Tous' },
                  { id: 'siege', label: 'Siège' },
                  { id: 'others', label: 'Autres' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTypeEtab(item.id)}
                    className={`py-1.5 rounded text-center text-[11px] font-semibold transition-all ${
                      typeEtab === item.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Statut Entreprise & Établissement */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-300">Statut</span>
                <span className="bg-blue-500/20 text-blue-400 font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                  2
                </span>
              </div>

              {/* Statut Entreprise */}
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block mb-1">ENTREPRISE</span>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {[
                    { id: 'all', label: 'Toutes' },
                    { id: 'active', label: 'Active' },
                    { id: 'cessee', label: 'Cessée' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStatutUl(item.id)}
                      className={`py-1 rounded text-center text-[10.5px] font-semibold transition-all ${
                        statutUl === item.id
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Statut Établissement */}
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block mb-1">ÉTABLISSEMENT</span>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {[
                    { id: 'all', label: 'Tous' },
                    { id: 'active', label: 'Actif' },
                    { id: 'ferme', label: 'Fermé' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStatutEtab(item.id)}
                      className={`py-1 rounded text-center text-[10.5px] font-semibold transition-all ${
                        statutEtab === item.id
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Accordions complémentaires (fidèle à la liste de gauche Sirelium) */}
          <div className="pt-2 border-t border-slate-800 space-y-1">
            {[
              { id: 'labels', label: 'Labels & Qualifications', desc: 'RGE, Entreprise solidaire, Bio...' },
              { id: 'forme', label: 'Forme juridique', desc: 'SCI, SARL, SAS, Exploitation agricole...' },
              { id: 'activite', label: 'Activité & NAF', desc: 'Secteurs d\'activité, codes APE' },
              { id: 'effectif', label: 'Effectif', desc: 'Tranches de salariés' },
              { id: 'capital', label: 'Capital social', desc: 'Montants minimum et maximum' },
              { id: 'creation', label: 'Création / Fermeture', desc: 'Années d\'immatriculation' }
            ].map(sec => {
              const isOpen = activeSection === sec.id;
              return (
                <div key={sec.id} className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                  <button
                    type="button"
                    onClick={() => setActiveSection(isOpen ? null : sec.id)}
                    className="w-full px-3 py-2 text-left flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="font-semibold uppercase tracking-wider text-[10px]">{sec.label}</span>
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="px-3 py-2 border-t border-slate-800/60 bg-slate-900/60 text-slate-400 text-[11px]">
                      <p className="mb-2 italic">{sec.desc}</p>
                      <div className="text-[10px] text-slate-500">
                        Filtre actif via les boutons rapides ci-dessus. Utilisez également la barre de recherche globale.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer statistiques (comme Sirelium) */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] font-bold text-slate-400">
          <div>
            <span className="text-white">15M</span> ENTREPRISES
          </div>
          <div className="text-slate-500">•</div>
          <div>
            <span className="text-white">16.6M</span> ÉTABLISSEMENTS
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. ZONE CENTRALE : CARTE & BARRE DE RECHERCHE FLOTTANTE    */}
      {/* ========================================================= */}
      <div className="flex-1 relative h-full w-full">
        {/* Barre de recherche flottante en haut au centre */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-xl px-3 pointer-events-auto">
          <div className="relative flex items-center bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl shadow-xl overflow-hidden">
            {!showFilters && (
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                title="Afficher les filtres"
                className="pl-3 pr-2 py-2.5 text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1 border-r border-slate-200"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">Filtres</span>
              </button>
            )}

            <div className="pl-3 pr-2 text-slate-400 flex items-center">
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-slate-400" />
              )}
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Entreprise, dirigeant, SIREN, n° TVA, adresse..."
              className="flex-1 py-2.5 text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-hidden font-medium"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchDropdown(false); }}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleRecenterProject}
              title="Recentrer sur le site du projet"
              className="px-3 py-2.5 bg-slate-50 hover:bg-blue-50 border-l border-slate-200 text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] font-bold hidden md:inline">Projet</span>
            </button>
          </div>

          {/* Menu déroulant de résultats de recherche */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-100">
              {searchResults.map((item, idx) => (
                <div
                  key={`${item.siren}-${idx}`}
                  onClick={() => {
                    setShowSearchDropdown(false);
                    if (item.lat && item.lon && mapRef.current) {
                      mapRef.current.flyTo([item.lat, item.lon], 17, { duration: 1.0 });
                    }
                    handleSelectEstablishment(item.siren);
                  }}
                  className="p-3 hover:bg-blue-50/80 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {item.nom_raison_sociale}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate flex items-center gap-2 mt-0.5">
                      <span>SIREN {item.siren}</span>
                      {item.commune_ul && (
                        <>
                          <span>•</span>
                          <span>{item.code_postal_ul} {item.commune_ul}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.statut_ul === 'cessee'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {item.statut_ul === 'cessee' ? 'Cessée' : 'Active'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Indicateur de chargement en haut à droite */}
        {isLoadingPins && (
          <div className="absolute top-4 right-4 z-[999] bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg shadow-md px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Chargement des établissements...</span>
          </div>
        )}

        {/* Barre d'outils flottante au bas de la carte (identique à Sirelium) */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-300 rounded-full shadow-xl px-2 py-1">
          <button
            type="button"
            onClick={handleRecenterProject}
            title="Recentrer sur le projet"
            className="p-2 rounded-full hover:bg-blue-50 text-slate-700 hover:text-blue-600 transition-colors"
          >
            <MapPin className="w-4 h-4 text-red-600" />
          </button>

          <div className="w-[1px] h-4 bg-slate-300" />

          <button
            type="button"
            onClick={() => mapRef.current && mapRef.current.zoomIn()}
            title="Zoom avant"
            className="p-2 rounded-full hover:bg-slate-100 text-slate-700 transition-colors font-bold text-sm"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => mapRef.current && mapRef.current.zoomOut()}
            title="Zoom arrière"
            className="p-2 rounded-full hover:bg-slate-100 text-slate-700 transition-colors font-bold text-sm"
          >
            −
          </button>

          <div className="w-[1px] h-4 bg-slate-300" />

          {/* Bouton couches cartographiques */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              title="Changer de fond de carte"
              className={`p-2 rounded-full transition-colors ${
                showLayerMenu ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>
            {showLayerMenu && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 w-44 space-y-1 text-xs font-semibold text-slate-700">
                {[
                  { id: 'carto_voyager', label: 'Carto Voyager (Sirelium)' },
                  { id: 'satellite', label: 'Vue Aérienne / Satellite' },
                  { id: 'osm', label: 'OpenStreetMap standard' }
                ].map(l => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => { setBaseMap(l.id); setShowLayerMenu(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                      baseMap === l.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span>{l.label}</span>
                    {baseMap === l.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bouton ouverture Sirelium officiel */}
          <a
            href={`https://sirelium.fr/#map=16/${projectCoords[0]}/${projectCoords[1]}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvrir sur Sirélium.fr dans un nouvel onglet"
            className="p-2 rounded-full hover:bg-blue-50 text-slate-700 hover:text-blue-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Conteneur Leaflet */}
        <MapContainer
          ref={mapRef}
          center={projectCoords}
          zoom={16}
          scrollWheelZoom={true}
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            key={tileUrl}
            url={tileUrl}
            attribution='&copy; <a href="https://carto.com/">CARTO</a> / &copy; OpenStreetMap'
            maxZoom={20}
          />

          <MapBoundsListener onBoundsChange={handleBoundsChange} />

          {/* Marqueur officiel du site du projet */}
          <Marker position={projectCoords} icon={createProjectMarkerIcon()}>
            <Popup>
              <div className="p-1 font-sans text-xs">
                <div className="font-bold text-red-600 flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Site du Projet Nelson
                </div>
                <div className="text-slate-600 text-[11px]">
                  {project?.demandeur || project?.clientName || 'Projet en cours'}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  {projectCoords[0].toFixed(5)}, {projectCoords[1].toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Marqueurs d'établissements chargés dynamiquement */}
          {pins.map((feat, idx) => {
            const coords = feat.geometry?.coordinates;
            if (!coords || coords.length < 2) return null;
            const [lon, lat] = coords;
            const props = feat.properties || {};
            const isSelected = selectedSiret === props.siret || selectedSiren === props.siret?.slice(0, 9);

            return (
              <Marker
                key={props.siret || `pin-${idx}`}
                position={[lat, lon]}
                icon={createBuildingIcon(isSelected, props.count || 1)}
                eventHandlers={{
                  click: () => {
                    const siren = props.siret ? props.siret.slice(0, 9) : props.siren;
                    handleSelectEstablishment(siren, props.siret);
                  }
                }}
              >
                <Popup>
                  <div className="p-1 font-sans text-xs min-w-[180px]">
                    <div className="font-bold text-slate-900 text-xs mb-0.5">
                      {props.nom || 'Entreprise'}
                    </div>
                    {props.enseigne && (
                      <div className="text-[11px] text-blue-600 font-semibold mb-1">
                        {props.enseigne}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 font-mono mb-2">
                      SIRET : {props.siret}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const siren = props.siret ? props.siret.slice(0, 9) : props.siren;
                        handleSelectEstablishment(siren, props.siret);
                      }}
                      className="w-full py-1 px-2 rounded bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Voir la fiche</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Clusters pour zoom éloigné */}
          {clusters.map((c, cIdx) => {
            const coords = c.geometry?.coordinates;
            if (!coords) return null;
            // Si c'est un point ou un polygone de cluster
            const center = Array.isArray(coords[0]) ? [coords[0][1], coords[0][0]] : [coords[1], coords[0]];
            const count = c.properties?.count || 10;
            return (
              <Marker
                key={`cluster-${cIdx}`}
                position={center}
                icon={createClusterIcon(count)}
                eventHandlers={{
                  click: () => {
                    if (mapRef.current) {
                      mapRef.current.setView(center, Math.min(18, currentZoom + 2));
                    }
                  }
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* ========================================================= */}
      {/* 3. PANNEAU DROITE : FICHE ENTREPRISE (STYLE SIRELIUM)      */}
      {/* ========================================================= */}
      {selectedSiren && (
        <div className="w-96 min-w-[380px] bg-slate-900 text-slate-100 flex flex-col z-30 shadow-2xl border-l border-slate-800 animate-slide-in-right h-full overflow-hidden">
          {/* Header Fiche entreprise */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-400" />
              <h2 className="font-bold text-sm tracking-wide text-white">Fiche entreprise</h2>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedSiren(null); setFicheData(null); }}
              title="Fermer la fiche"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Corps de la fiche */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {isLoadingFiche ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="font-semibold text-xs">Chargement des données INSEE & RNE...</span>
              </div>
            ) : ficheData?.ul ? (
              <>
                {/* Hero Card : Nom & Statuts */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-start gap-3 mb-2.5">
                    <div className="w-10 h-10 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-sm text-white leading-tight uppercase">
                        {ficheData.ul.nom_raison_sociale}
                      </h3>
                      {ficheData.ul.sigle && (
                        <div className="text-[11px] text-blue-400 font-bold mt-0.5">
                          Sigle : {ficheData.ul.sigle}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges d'activité */}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80 text-[10px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      INSEE • {ficheData.ul.statut_insee_ul || 'Active'} {ficheData.ul.date_creation_insee ? `(${ficheData.ul.date_creation_insee})` : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-blue-950 text-blue-300 border border-blue-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      RNE • {ficheData.ul.statut_rne_ul || 'En activité'}
                    </span>
                  </div>
                </div>

                {/* Caractéristiques juridiques */}
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Forme juridique</span>
                    <span className="font-semibold text-slate-200">{ficheData.ul.forme_juridique || 'Non communiquée'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Effectif</span>
                      <span className="font-semibold text-slate-200">{ficheData.ul.tranche_effectif_ul || '0 salarié'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Capital social</span>
                      <span className="font-semibold text-slate-200">
                        {ficheData.ul.capital_montant
                          ? `${Number(ficheData.ul.capital_montant).toLocaleString('fr-FR')} ${ficheData.ul.capital_devise || 'EUR'}`
                          : 'Non renseigné'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 space-y-2">
                    {/* SIREN */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">SIREN</span>
                        <span className="font-mono font-bold text-white text-xs">{ficheData.ul.siren}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(ficheData.ul.siren, 'siren')}
                        className="p-1 text-slate-400 hover:text-white rounded"
                        title="Copier le SIREN"
                      >
                        {copiedKey === 'siren' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* SIRET Siège */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">SIRET Siège</span>
                        <span className="font-mono font-bold text-white text-xs">{ficheData.ul.siret_siege || 'Non renseigné'}</span>
                      </div>
                      {ficheData.ul.siret_siege && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(ficheData.ul.siret_siege, 'siret')}
                          className="p-1 text-slate-400 hover:text-white rounded"
                          title="Copier le SIRET"
                        >
                          {copiedKey === 'siret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* N° TVA */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">N° TVA</span>
                      <span className="text-slate-300 font-mono text-[11px]">
                        {ficheData.ul.numeros_tva && ficheData.ul.numeros_tva.length > 0
                          ? ficheData.ul.numeros_tva.join(', ')
                          : 'Aucun numéro actif'}
                      </span>
                    </div>

                    {/* Adresse */}
                    <div className="pt-2 border-t border-slate-800/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Adresse</span>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-200">
                          {ficheData.ul.adresse_complete_ul} {ficheData.ul.code_postal_ul} {ficheData.ul.commune_ul}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`${ficheData.ul.adresse_complete_ul} ${ficheData.ul.code_postal_ul} ${ficheData.ul.commune_ul}`, 'addr')}
                          className="p-1 text-slate-400 hover:text-white rounded shrink-0"
                          title="Copier l'adresse"
                        >
                          {copiedKey === 'addr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Activité */}
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                    Activité
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Activité (APE / NAF)
                    </span>
                    <span className="font-bold text-white">
                      {ficheData.ul.code_naf_ul}
                    </span>
                  </div>

                  {ficheData.ul.objet_social && (
                    <div className="pt-2 border-t border-slate-800/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Objet social
                      </span>
                      <p className="text-[11px] text-slate-300 line-clamp-4 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800">
                        {ficheData.ul.objet_social}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bouton d'action Nelson : Renseigner comme demandeur */}
                <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3">
                  <div className="text-xs font-bold text-blue-300 mb-1 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Utiliser pour le projet Nelson
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2.5">
                    Injecte automatiquement cette entreprise comme Demandeur / Client dans les formulaires et les dossiers d'urbanisme.
                  </p>
                  <button
                    type="button"
                    onClick={handleAdoptClient}
                    className={`w-full py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                      adoptedClient
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                    }`}
                  >
                    {adoptedClient ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Client renseigné avec succès !</span>
                      </>
                    ) : (
                      <>
                        <span>Renseigner comme demandeur du projet</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="p-4 text-center text-slate-400">
                Aucune donnée disponible pour cet établissement.
              </div>
            )}
          </div>

          {/* Sticky footer actions officielles */}
          {ficheData?.ul && (
            <div className="p-3 border-t border-slate-800 bg-slate-950 grid grid-cols-2 gap-2">
              <a
                href={`https://api-avis-situation-sirene.insee.fr/identification/pdf/${ficheData.ul.siret_siege || ficheData.ul.siren}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-2.5 rounded-lg font-bold text-[11px] text-center bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Avis SIRENE</span>
              </a>
              <a
                href={`https://data.inpi.fr/entreprises/${ficheData.ul.siren}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-2.5 rounded-lg font-bold text-[11px] text-center bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span>Extrait INPI</span>
              </a>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
