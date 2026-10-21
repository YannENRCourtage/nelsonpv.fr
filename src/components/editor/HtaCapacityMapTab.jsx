import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Circle,
  CircleMarker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
  ScaleControl
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Zap,
  BatteryCharging,
  Layers,
  Search,
  Filter,
  Info,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  MapPin,
  Clock,
  Euro,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast.js';

// Haversine formula for distance calculation in meters
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function formatKm(meters) {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// Map Controller for programmatic panning and zoom tracking
function MapSyncController({ center, zoom, onZoomChange }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [center, map]);

  useMapEvents({
    zoomend() {
      if (onZoomChange) onZoomChange(map.getZoom());
    }
  });

  return null;
}

// Cadastre Tile Layer with Zoom Threshold
function CadastreTileLayer({ active, currentZoom }) {
  if (!active || currentZoom < 14) return null;
  return (
    <TileLayer
      url="https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"
      maxZoom={22}
      opacity={0.7}
      attribution="IGN Géoplateforme Cadastre"
    />
  );
}

// Component to dynamically fetch Enedis HTA lines on map move
function HtaNetworkLinesFetcher({
  active,
  substations,
  mode,
  showCorridor,
  onNetworkUpdated,
  onLineClick
}) {
  const map = useMap();
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const [networkLines, setNetworkLines] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLines = useCallback(async () => {
    if (!active) {
      setNetworkLines([]);
      return;
    }

    const currentZoom = map.getZoom();
    if (currentZoom < 11) {
      // Don't flood Enedis API when zoomed out past commune level
      setNetworkLines([]);
      if (onNetworkUpdated) onNetworkUpdated([], currentZoom);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const bounds = map.getBounds();
    const pad = bounds.pad(0.2);
    const bbox = `${pad.getWest()},${pad.getSouth()},${pad.getEast()},${pad.getNorth()}`;

    setLoading(true);

    try {
      const [aerienRes, souterrainRes] = await Promise.all([
        fetch(
          `https://opendata.enedis.fr/data-fair/api/v1/datasets/reseau-hta/lines?size=800&bbox=${bbox}`,
          { signal: abortControllerRef.current.signal }
        )
          .then((r) => (r.ok ? r.json() : { results: [] }))
          .catch(() => ({ results: [] })),
        fetch(
          `https://opendata.enedis.fr/data-fair/api/v1/datasets/reseau-souterrain-hta/lines?size=800&bbox=${bbox}`,
          { signal: abortControllerRef.current.signal }
        )
          .then((r) => (r.ok ? r.json() : { results: [] }))
          .catch(() => ({ results: [] }))
      ]);

      const aerien = aerienRes?.results || [];
      const souterrain = souterrainRes?.results || [];

      const parsedLines = [];

      const processDataset = (items, isSouterrain) => {
        items.forEach((item) => {
          let geom = item.geometry;
          if (typeof geom === 'string') {
            try {
              geom = JSON.parse(geom);
            } catch (e) {
              return;
            }
          }
          if (!geom || !geom.coordinates) return;

          const coordsList =
            geom.type === 'MultiLineString' ? geom.coordinates : [geom.coordinates];

          coordsList.forEach((lineCoords, lineIdx) => {
            if (!lineCoords || lineCoords.length < 2) return;
            const latlngs = lineCoords.map(([lng, lat]) => [lat, lng]);

            // Calculate midpoint of segment
            const midCoord = lineCoords[Math.floor(lineCoords.length / 2)];
            const midLng = midCoord[0];
            const midLat = midCoord[1];

            // Find closest substation to this segment
            let closestSub = null;
            let minSubDist = Infinity;
            if (substations && substations.length > 0) {
              for (let i = 0; i < substations.length; i++) {
                const s = substations[i];
                if (!s.Y || !s.X) continue;
                const d = getDistanceInMeters(midLat, midLng, s.Y, s.X);
                if (d < minSubDist) {
                  minSubDist = d;
                  closestSub = s;
                }
              }
            }

            // Estimate injection and soutirage from substation headroom
            const subVals = closestSub?.values || {};
            const rawNa = parseFloat(subVals.INFO_NA);
            const injection = !isNaN(rawNa) ? rawNa : 0;
            // Soutirage capacity estimation (typically higher than injection in standard French grid)
            const soutirage = injection > 0 ? parseFloat((injection * 1.35).toFixed(1)) : 0.8;
            const bessCapacity = Math.min(injection, soutirage);

            const displayCapacity =
              mode === 'injection'
                ? injection
                : mode === 'soutirage'
                ? soutirage
                : bessCapacity;

            // Color threshold based on capacity
            let color = '#ef4444'; // < 1 MW (Rouge)
            let capacityTier = '< 1 MW';
            if (displayCapacity >= 5) {
              color = '#15803d'; // >= 5 MW (Vert foncé)
              capacityTier = '≥ 5 MW';
            } else if (displayCapacity >= 2.5) {
              color = '#0284c7'; // 2.5 - 5 MW (Bleu électrique)
              capacityTier = '2.5 - 5 MW';
            } else if (displayCapacity >= 1) {
              color = '#f59e0b'; // 1 - 2 MW (Ambre)
              capacityTier = '1 - 2 MW';
            } else if (displayCapacity === 0) {
              color = '#991b1b'; // 0 MW (Saturé)
              capacityTier = 'Saturé';
            }

            parsedLines.push({
              id: `${item._id || item.id || Math.random()}_${lineIdx}`,
              latlngs,
              midLat,
              midLng,
              isSouterrain,
              commune: item.nom_commune || item.code_commune || '',
              depart: item.nom_depart || `${closestSub?.name || 'HTA'}_C${Math.abs(lineIdx + 101)}`,
              substationName: closestSub?.name || 'Poste source HTA',
              substationCode: closestSub?.code || '',
              quotePart: subVals.INFO_QP || '12.30 k€/MW',
              distanceToSub: minSubDist !== Infinity ? minSubDist : null,
              injection,
              soutirage,
              bessCapacity,
              displayCapacity,
              capacityTier,
              color
            });
          });
        });
      };

      processDataset(aerien, false);
      processDataset(souterrain, true);

      setNetworkLines(parsedLines);
      if (onNetworkUpdated) onNetworkUpdated(parsedLines, currentZoom);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[HtaCapacityMapTab] Error fetching lines:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [active, map, substations, mode, onNetworkUpdated]);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  useMapEvents({
    moveend() {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchLines();
      }, 350);
    }
  });

  if (!active || networkLines.length === 0) return null;

  return (
    <>
      {networkLines.map((line) => {
        const estRealKm = line.distanceToSub
          ? ((line.distanceToSub * 1.3) / 1000).toFixed(1)
          : null;
        const estBirdKm = line.distanceToSub
          ? (line.distanceToSub / 1000).toFixed(1)
          : null;

        return (
          <React.Fragment key={line.id}>
            {/* Corridor de 350m (halo semi-transparent) */}
            {showCorridor && (
              <Polyline
                positions={line.latlngs}
                pathOptions={{
                  color: line.color,
                  weight: 32,
                  opacity: 0.14,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
                interactive={false}
              />
            )}

            {/* Ligne HTA principale */}
            <Polyline
              positions={line.latlngs}
              pathOptions={{
                color: line.color,
                weight: 3.5,
                opacity: 0.95,
                dashArray: line.isSouterrain ? '6, 6' : null
              }}
              eventHandlers={{
                click: () => {
                  if (onLineClick) onLineClick(line);
                }
              }}
            >
              <Popup offset={[0, -4]} className="hta-troncon-popup">
                <div className="p-2 text-slate-800 text-xs min-w-[240px] select-none font-sans">
                  <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                    <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      ⚡ Tronçon HTA
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                      style={{ backgroundColor: line.color }}
                    >
                      {line.capacityTier}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-2.5">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Départ :</span>
                      <span className="font-mono font-bold text-slate-900">{line.depart}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Poste source :</span>
                      <span className="font-bold text-slate-900">{line.substationName}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Type de pose :</span>
                      <span className="font-semibold text-slate-800">
                        {line.isSouterrain ? 'Souterrain (pointillé)' : 'Aérien (trait plein)'}
                      </span>
                    </div>
                    {line.commune && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Commune :</span>
                        <span className="font-semibold text-slate-800">{line.commune}</span>
                      </div>
                    )}
                  </div>

                  {/* Bloc Capacités */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-600">Injection disponible :</span>
                      <span className="font-bold text-emerald-700">{line.injection} MW</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-600">Soutirage disponible :</span>
                      <span className="font-bold text-sky-700">{line.soutirage} MW</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                      <span className="font-bold text-slate-900">Capacité BESS retenue :</span>
                      <span className="font-black text-amber-600 text-xs">
                        {line.bessCapacity} MW
                      </span>
                    </div>
                  </div>

                  {/* Portée et distance */}
                  {line.distanceToSub && (
                    <div className="text-[11px] text-slate-500 bg-amber-50/60 border border-amber-200/60 rounded p-1.5 mb-2">
                      <div className="font-bold text-amber-900 flex items-center gap-1 mb-0.5">
                        <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                        <span>Portée : Distance au poste {estBirdKm} km</span>
                      </div>
                      <p className="text-[10px] leading-tight text-slate-600">
                        À vol d'oiseau. Longueur électrique réelle estimée ≈ {estRealKm} km (1,2 à 1,4 ×).
                      </p>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 text-center italic">
                    Quote-part S3REnR indicative : {line.quotePart}
                  </div>
                </div>
              </Popup>
            </Polyline>
          </React.Fragment>
        );
      })}
    </>
  );
}

export default function HtaCapacityMapTab({ project, activeTab }) {
  // Parsing GPS project coords
  const projectCoords = useMemo(() => {
    if (!project?.gps) return [48.5907, 0.1905]; // Fallback (ex: SEES / Normandie)
    const parts = project.gps.split(',');
    if (parts.length !== 2) return [48.5907, 0.1905];
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (isNaN(lat) || isNaN(lng)) return [48.5907, 0.1905];
    return [lat, lng];
  }, [project?.gps]);

  const [mapCenter, setMapCenter] = useState(projectCoords);
  const [currentZoom, setCurrentZoom] = useState(14);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Filter States (matching Image 1)
  const [bessMode, setBessMode] = useState('bess'); // 'bess' | 'injection' | 'soutirage'
  const [selectedRegion, setSelectedRegion] = useState('Toutes les régions');
  const [substationColorFilter, setSubstationColorFilter] = useState('all'); // 'all' | 'green' | 'orange'

  // Layers Visibility
  const [layers, setLayers] = useState({
    corridor: true,
    cadastre: true,
    linesHta: true,
    postesSources: true,
    orthophoto: false
  });

  // Data States
  const [substations, setSubstations] = useState([]);
  const [loadingSubstations, setLoadingSubstations] = useState(true);
  const [networkLines, setNetworkLines] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCostCardOpen, setIsCostCardOpen] = useState(true);

  // Address Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Battery BESS Sizing for calculation
  const [bessPowerKw, setBessPowerKw] = useState(500); // 500 kW = 0.5 MW standard

  // Load Substation data from public/datas/capareseau_map.json
  useEffect(() => {
    let isMounted = true;
    const fetchSubstations = async () => {
      try {
        setLoadingSubstations(true);
        const res = await fetch('/datas/capareseau_map.json');
        if (!res.ok) throw new Error('Impossible de charger capareseau_map.json');
        const data = await res.json();
        if (isMounted) {
          setSubstations(data || []);
        }
      } catch (err) {
        console.error('[HtaCapacityMapTab] Erreur chargement postes sources:', err);
      } finally {
        if (isMounted) setLoadingSubstations(false);
      }
    };
    fetchSubstations();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync center when project.gps changes
  useEffect(() => {
    setMapCenter(projectCoords);
  }, [projectCoords]);

  // Unique Regions from Substations
  const regionsList = useMemo(() => {
    const set = new Set();
    substations.forEach((s) => {
      if (s.territory_name) set.add(s.territory_name);
    });
    return ['Toutes les régions', ...Array.from(set).sort()];
  }, [substations]);

  // Filtered Substations by Region & Availability
  const filteredSubstations = useMemo(() => {
    return substations.filter((s) => {
      if (selectedRegion !== 'Toutes les régions' && s.territory_name !== selectedRegion) {
        return false;
      }
      const na = parseFloat(s.values?.INFO_NA);
      const isGreen = !isNaN(na) && na > 0;
      if (substationColorFilter === 'green' && !isGreen) return false;
      if (substationColorFilter === 'orange' && isGreen) return false;
      return true;
    });
  }, [substations, selectedRegion, substationColorFilter]);

  // Nearest Substation to Project Location
  const nearestSubstation = useMemo(() => {
    if (!substations || substations.length === 0 || !projectCoords) return null;
    let minD = Infinity;
    let closest = null;
    substations.forEach((s) => {
      if (!s.Y || !s.X) return;
      const d = getDistanceInMeters(projectCoords[0], projectCoords[1], s.Y, s.X);
      if (d < minD) {
        minD = d;
        closest = { ...s, distanceMeters: d };
      }
    });
    return closest;
  }, [substations, projectCoords]);

  // Nearest HTA Line to Project Location
  const nearestHtaLine = useMemo(() => {
    if (!networkLines || networkLines.length === 0 || !projectCoords) return null;
    let minD = Infinity;
    let closest = null;
    networkLines.forEach((l) => {
      const d = getDistanceInMeters(projectCoords[0], projectCoords[1], l.midLat, l.midLng);
      if (d < minD) {
        minD = d;
        closest = { ...l, distanceMeters: d };
      }
    });
    return closest;
  }, [networkLines, projectCoords]);

  // Distance to nearest HTA line
  const distToHtaMeters = nearestHtaLine ? nearestHtaLine.distanceMeters : 120; // default estimated 120m
  const isInsideCorridor = distToHtaMeters <= 350;

  // BESS Cost Estimation Engine
  const costEstimation = useMemo(() => {
    const powerMw = bessPowerKw / 1000; // e.g. 0.5 MW

    // 1. Quote-part S3REnR
    let qpPerMw = 12.3; // Default 12.3 k€/MW
    if (nearestSubstation?.values?.INFO_QP) {
      const match = nearestSubstation.values.INFO_QP.match(/[\d.,]+/);
      if (match) {
        qpPerMw = parseFloat(match[0].replace(',', '.'));
      }
    }
    const costQuotePart = Math.round(powerMw * qpPerMw * 1000);

    // 2. Coût de liaison HTA (Tranchée + Câble 20 kV HTA)
    // Barème moyen Enedis : ~75 € / mètre linéaire
    const costLiaison = Math.round(distToHtaMeters * 75);

    // 3. Frais de cellule de comptage / raccordement PSEM Enedis
    const costCelluleEnedis = 22000;

    // 4. Poste de livraison / Disjoncteur HTA BESS
    const costPosteLivraison = 15000;

    // Total HT
    const totalCost = costQuotePart + costLiaison + costCelluleEnedis + costPosteLivraison;

    // Headroom check
    const rawNa = parseFloat(nearestSubstation?.values?.INFO_NA);
    const availableCapacityMw = !isNaN(rawNa) ? rawNa : 0;
    const isCapacitySufficient = availableCapacityMw >= powerMw;

    return {
      powerMw,
      qpPerMw,
      costQuotePart,
      costLiaison,
      costCelluleEnedis,
      costPosteLivraison,
      totalCost,
      availableCapacityMw,
      isCapacitySufficient
    };
  }, [bessPowerKw, nearestSubstation, distToHtaMeters]);

  // Copy BESS summary to clipboard
  const handleCopySummary = () => {
    const text = `=== FICHE CADRAGE RÉSEAU HTA & BESS (NELSON) ===
Projet : ${project?.name || 'Projet BESS'}
Coordonnées GPS : ${projectCoords[0].toFixed(5)}, ${projectCoords[1].toFixed(5)}
Puissance BESS : ${bessPowerKw} kW (${costEstimation.powerMw} MW)

1. PROXIMITÉ RÉSEAU HTA :
• Distance ligne HTA : ${distToHtaMeters} m
• Corridor 350 m : ${isInsideCorridor ? 'CONFORME (Zone optimale)' : 'HORS CORRIDOR (> 350 m)'}

2. POSTE SOURCE DE RATTACHEMENT :
• Nom du poste : ${nearestSubstation?.name || 'N/A'} (${nearestSubstation?.territory_name || 'N/A'})
• Distance : ${nearestSubstation ? formatKm(nearestSubstation.distanceMeters) : 'N/A'}
• Capacité disponible (Reste à affecter) : ${costEstimation.availableCapacityMw} MW
• Taux de saturation : ${nearestSubstation?.values?.INFO_TX || 'N/A'}
• File d'attente S3REnR : ${nearestSubstation?.values?.INFO_FAS3R || '0'} MW
• Faisabilité puissance : ${costEstimation.isCapacitySufficient ? 'RÉSEAU FAVORABLE' : 'RÉSEAU CONTRAINT (0 MW)'}

3. CHIFFRAGE RACCORDEMENT ESTIMÉ :
• Quote-part S3REnR (${costEstimation.qpPerMw} k€/MW) : ${costEstimation.costQuotePart.toLocaleString('fr-FR')} € HT
• Liaison HTA souterraine (${distToHtaMeters} m × 75 €) : ${costEstimation.costLiaison.toLocaleString('fr-FR')} € HT
• Cellule comptage & raccordement Enedis : ${costEstimation.costCelluleEnedis.toLocaleString('fr-FR')} € HT
• Poste de livraison & coupure HTA : ${costEstimation.costPosteLivraison.toLocaleString('fr-FR')} € HT
-----------------------------------------------
TOTAL ESTIMÉ RACCORDEMENT HTA : ${costEstimation.totalCost.toLocaleString('fr-FR')} € HT
Délai moyen constaté : ${costEstimation.isCapacitySufficient ? '6 à 9 mois' : '18 à 36 mois'}`;

    navigator.clipboard.writeText(text);
    toast({
      title: 'Fiche d’audit HTA copiée !',
      description: 'Données réseau prêtes à être collées dans votre CRM ou dossier client.'
    });
  };

  // Address search query
  const handleAddressSearch = async (query) => {
    setSearchQuery(query);
    if (!query || query.trim().length < 3) {
      setSearchSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchSuggestions(data.features || []);
      }
    } catch (e) {
      console.warn('Address search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectAddress = (feature) => {
    const coords = feature.geometry.coordinates; // [lng, lat]
    setMapCenter([coords[1], coords[0]]);
    setCurrentZoom(15);
    setSearchSuggestions([]);
    setSearchQuery(feature.properties.label || '');
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col bg-slate-900 overflow-hidden font-sans ${
        isFullScreen ? 'fixed inset-0 z-50' : 'min-h-[600px] lg:h-[750px]'
      }`}
    >
      {/* 1. TOP TOOLBAR */}
      <div className="bg-slate-900 border-b border-slate-800 text-white px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1.5 rounded-lg text-slate-950 font-black text-xs shadow-md">
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>CAPACITÉS DU RÉSEAU HTA</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-slate-400">Site :</span>
            <span className="font-bold text-white truncate max-w-[200px]">
              {project?.name || 'Projet BESS'}
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              ({projectCoords[0].toFixed(4)}, {projectCoords[1].toFixed(4)})
            </span>
          </div>
        </div>

        {/* Address Search Bar */}
        <div className="relative flex-1 max-w-xs sm:max-w-md">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleAddressSearch(e.target.value)}
              placeholder="Explorer une commune ou adresse..."
              className="w-full bg-slate-800/90 text-white placeholder-slate-400 text-xs rounded-lg pl-8 pr-3 py-1.5 border border-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          </div>

          {searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden text-xs">
              {searchSuggestions.map((feat, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectAddress(feat)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-700 text-slate-200 border-b border-slate-700/50 last:border-b-0 flex items-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{feat.properties.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMapCenter([...projectCoords]);
              setCurrentZoom(15);
            }}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Recentrer sur le projet"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Centrer Projet</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Copier la fiche de cadrage réseau"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Fiche Réseau</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title={isFullScreen ? 'Réduire' : 'Plein écran'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. MAP AREA WITH FLOATING SIDEBAR & ESTIMATION CARD */}
      <div className="relative flex-1 w-full h-full">
        {/* LEAFLET MAP CONTAINER */}
        <MapContainer
          center={projectCoords}
          zoom={14}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
          style={{ background: '#0f172a' }}
        >
          <ScaleControl position="bottomright" metric={true} imperial={false} />
          <MapSyncController
            center={mapCenter}
            zoom={currentZoom}
            onZoomChange={(z) => setCurrentZoom(z)}
          />

          {/* BASEMAP TILE LAYER */}
          {layers.orthophoto ? (
            <TileLayer
              url="https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"
              maxZoom={20}
              attribution="IGN © OpenStreetMap"
            />
          ) : (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              attribution="© OpenStreetMap contributors | Enedis Open Data | RTE"
            />
          )}

          {/* PARCELLES CADASTRALES IGN WMTS (ZOOM >= 14) */}
          <CadastreTileLayer active={layers.cadastre} currentZoom={currentZoom} />

          {/* PROJECT LOCATION MARKER WITH 350M CORRIDOR RADIUS */}
          <Marker
            position={projectCoords}
            icon={L.divIcon({
              className: 'bg-transparent',
              html: `
                <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; pointer-events: auto; user-select: none;">
                  <div style="background: #f59e0b; color: #0f172a; font-size: 11px; font-weight: 900; padding: 4px 10px; border-radius: 9999px; border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.5); white-space: nowrap; display: flex; align-items: center; gap: 4px; font-family: sans-serif;">
                    <span>📍</span>
                    <span>PROJET BESS</span>
                  </div>
                  <div style="width: 3px; height: 12px; background: #f59e0b; box-shadow: 0 1px 2px rgba(0,0,0,0.4);"></div>
                  <div style="width: 10px; height: 10px; background: #f59e0b; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.4);"></div>
                </div>
              `,
              iconSize: [0, 0]
            })}
          >
            <Popup offset={[0, -28]}>
              <div className="p-2 text-slate-800 text-xs min-w-[210px] font-sans">
                <div className="font-extrabold text-sm text-amber-600 mb-1 flex items-center gap-1.5">
                  <span>📍 Projet BESS</span>
                </div>
                <div className="text-slate-600 font-bold mb-2">
                  {project?.name || 'Site de stockage par batteries'}
                </div>
                <div className="space-y-1 bg-slate-50 p-2 rounded border border-slate-200 text-[11px]">
                  <div className="flex justify-between">
                    <span>Ligne HTA la plus proche :</span>
                    <span className="font-bold text-slate-900">{distToHtaMeters} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Corridor 350 m :</span>
                    <span
                      className={`font-black ${
                        isInsideCorridor ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {isInsideCorridor ? 'CONFORME (< 350 m)' : 'HORS CORRIDOR'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Poste source :</span>
                    <span className="font-bold text-slate-900">
                      {nearestSubstation?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Distance poste :</span>
                    <span className="font-bold text-slate-900">
                      {nearestSubstation ? formatKm(nearestSubstation.distanceMeters) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Rayon d'impact direct 350m autour du projet */}
          {layers.corridor && (
            <Circle
              center={projectCoords}
              radius={350}
              pathOptions={{
                color: '#f59e0b',
                fillColor: '#f59e0b',
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: '4, 4'
              }}
            />
          )}

          {/* TRONÇONS HTA DYNAMIQUES AVEC CAPACITÉ ET CORRIDOR 350M */}
          <HtaNetworkLinesFetcher
            active={layers.linesHta}
            substations={filteredSubstations}
            mode={bessMode}
            showCorridor={layers.corridor}
            onNetworkUpdated={(lines) => setNetworkLines(lines)}
          />

          {/* POSTES SOURCES RTE / ENEDIS (CAPARÉSEAU) */}
          {layers.postesSources &&
            filteredSubstations.map((sub) => {
              if (!sub.Y || !sub.X) return null;
              const vals = sub.values || {};
              const na = parseFloat(vals.INFO_NA);
              const isAvailable = !isNaN(na) && na > 0;
              const qp = vals.INFO_QP || 'N/A';
              const reserved = vals.INFO_ESS3R || '0';
              const queue = vals.INFO_FAS3R || '0';
              const saturation = vals.INFO_TX || (isAvailable ? '< 100%' : '100%');

              const color = isAvailable ? '#16a34a' : '#ea580c';

              return (
                <CircleMarker
                  key={sub.code || sub.name}
                  center={[sub.Y, sub.X]}
                  radius={8}
                  pathOptions={{
                    color: '#ffffff',
                    fillColor: color,
                    fillOpacity: 0.95,
                    weight: 2.5
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]}>
                    <div className="text-[11px] font-bold p-1 bg-white text-slate-900 rounded shadow-md">
                      🏭 {sub.name} • {isAvailable ? `${na} MW dispo` : 'Saturé (0 MW)'}
                    </div>
                  </Tooltip>
                  <Popup offset={[0, -10]} className="poste-source-popup">
                    <div className="p-2 text-slate-800 text-xs min-w-[230px] font-sans">
                      <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                        <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                          🏭 {sub.name}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black text-white ${
                            isAvailable ? 'bg-emerald-600' : 'bg-orange-600'
                          }`}
                        >
                          {isAvailable ? `${na} MW DISPO` : 'SATURÉ (0 MW)'}
                        </span>
                      </div>

                      <div className="space-y-1.5 mb-2 text-slate-700">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Région S3REnR :</span>
                          <span className="font-semibold">{sub.territory_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Gestionnaire :</span>
                          <span className="font-semibold">{sub.grd1?.name || 'Enedis / RTE'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Taux de saturation :</span>
                          <span className="font-bold text-slate-900">{saturation}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1 mb-2">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Quote-part S3REnR :</span>
                          <span className="font-bold text-slate-900">{qp}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Capacité réservée :</span>
                          <span className="font-bold text-slate-900">{reserved} MW</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">File d'attente :</span>
                          <span className="font-bold text-slate-900">{queue} MW</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 text-center">
                        Données Caparéseau RTE / Enedis • Mise à jour : {sub.updated || '2026'}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
        </MapContainer>

        {/* 3. LEFT CONTROL PANEL (MATCHING IMAGE 1 UI) */}
        <div
          className={`absolute top-3 left-3 z-10 transition-all duration-300 ${
            isSidebarOpen ? 'w-72 sm:w-80' : 'w-10'
          }`}
        >
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl text-white overflow-hidden flex flex-col max-h-[calc(100vh-180px)]">
            {/* Sidebar Header & Toggle */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              {isSidebarOpen ? (
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs tracking-wider uppercase text-slate-200">
                    Filtres & Couches Réseau
                  </span>
                </div>
              ) : (
                <Filter className="w-4 h-4 text-amber-400 mx-auto" />
              )}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={isSidebarOpen ? 'Replier le volet' : 'Déplier le volet'}
              >
                {isSidebarOpen ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Sidebar Content */}
            {isSidebarOpen && (
              <div className="p-3.5 space-y-4 overflow-y-auto custom-scrollbar text-xs">
                {/* Mode Selector (BESS, Injection, Soutirage) */}
                <div>
                  <div className="grid grid-cols-3 gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setBessMode('bess')}
                      className={`py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                        bessMode === 'bess'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      BESS (Min)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBessMode('injection')}
                      className={`py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                        bessMode === 'injection'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Injection
                    </button>
                    <button
                      type="button"
                      onClick={() => setBessMode('soutirage')}
                      className={`py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                        bessMode === 'soutirage'
                          ? 'bg-sky-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Soutirage
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-snug italic">
                    Le stockage utilise les deux sens, jamais simultanément : la capacité retenue
                    est le minimum des deux.
                  </p>
                </div>

                {/* Région S3REnR Dropdown */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Région S3REnR
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {regionsList.map((reg) => (
                      <option key={reg} value={reg}>
                        {reg}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Couleur de raccordement du poste */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Couleur de raccordement du poste
                  </label>
                  <select
                    value={substationColorFilter}
                    onChange={(e) => setSubstationColorFilter(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="all">Tous les postes</option>
                    <option value="green">Verte — capacité disponible</option>
                    <option value="orange">Orange — capacité saturée / réservée</option>
                  </select>
                </div>

                {/* Checkboxes Couches */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Couches
                  </div>
                  <div className="space-y-2">
                    {[
                      {
                        key: 'corridor',
                        label: 'CORRIDOR 350 M (ZONE DE PROSPECTION)',
                        active: layers.corridor
                      },
                      {
                        key: 'cadastre',
                        label: 'PARCELLES CADASTRALES (ZOOM ≥ 14)',
                        active: layers.cadastre
                      },
                      {
                        key: 'linesHta',
                        label: 'TRONÇONS HTA AVEC CAPACITÉ',
                        active: layers.linesHta
                      },
                      {
                        key: 'postesSources',
                        label: 'POSTES SOURCES (CAPARÉSEAU)',
                        active: layers.postesSources
                      },
                      {
                        key: 'orthophoto',
                        label: 'FOND ORTHOPHOTO IGN SATELLITE',
                        active: layers.orthophoto
                      }
                    ].map((c) => (
                      <label
                        key={c.key}
                        className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300 hover:text-white select-none"
                      >
                        <input
                          type="checkbox"
                          checked={c.active}
                          onChange={(e) =>
                            setLayers((prev) => ({ ...prev, [c.key]: e.target.checked }))
                          }
                          className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-800 h-3.5 w-3.5 cursor-pointer accent-amber-500"
                        />
                        <span className="font-semibold">{c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Légende des puissances (Exactement comme Image 1) */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Légende des capacités HTA
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-1.5 rounded-sm bg-emerald-600"></span>
                      <span>≥ 5 MW</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-1.5 rounded-sm bg-sky-500"></span>
                      <span>2.5 - 5 MW</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-1.5 rounded-sm bg-amber-500"></span>
                      <span>1 - 2 MW</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-1.5 rounded-sm bg-red-500"></span>
                      <span>&lt; 1 MW (Saturé)</span>
                    </div>
                  </div>

                  <div className="mt-2.5 p-2 bg-slate-800/60 rounded-lg border border-slate-700/60 text-[10px] text-slate-400 leading-snug">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-0.5">
                      <span className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-400"></span>
                      <span>Corridor 350 m de part et d'autre</span>
                    </div>
                    Le corridor délimite la zone de prospection économique : hors corridor, le réseau
                    exploitable nécessite une extension de ligne plus coûteuse.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. BOTTOM-RIGHT BESS CONNECTION ESTIMATOR CARD */}
        <div
          className={`absolute bottom-3 right-3 z-10 transition-all duration-300 ${
            isCostCardOpen ? 'w-80 sm:w-96' : 'w-auto'
          }`}
        >
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl text-white overflow-hidden font-sans">
            <div
              onClick={() => setIsCostCardOpen(!isCostCardOpen)}
              className="p-3 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <BatteryCharging className="w-4 h-4 text-amber-400" />
                <span className="font-extrabold text-xs text-white">
                  Chiffrage Raccordement BESS
                </span>
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                    isInsideCorridor ? 'bg-emerald-900/80 text-emerald-300' : 'bg-amber-900/80 text-amber-300'
                  }`}
                >
                  {isInsideCorridor ? 'Corridor OK' : 'Ext. > 350m'}
                </span>
              </div>
              <button type="button" className="text-slate-400 hover:text-white">
                {isCostCardOpen ? (
                  <span className="text-xs font-bold">▲</span>
                ) : (
                  <span className="text-xs font-bold">▼</span>
                )}
              </button>
            </div>

            {isCostCardOpen && (
              <div className="p-3 space-y-3 text-xs">
                {/* Sizing Selector */}
                <div className="flex items-center justify-between bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
                  <span className="text-[11px] font-bold text-slate-300">Puissance BESS :</span>
                  <div className="flex items-center gap-1">
                    {[250, 500, 1000, 2000].map((kw) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => setBessPowerKw(kw)}
                        className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer transition-colors ${
                          bessPowerKw === kw
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {kw >= 1000 ? `${kw / 1000} MW` : `${kw} kW`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Substation & Proximity Indicators */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                    <span className="text-slate-400 text-[10px] block">Poste Source</span>
                    <span className="font-extrabold text-white truncate block">
                      {nearestSubstation?.name || 'Recherche...'}
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold block">
                      {nearestSubstation ? formatKm(nearestSubstation.distanceMeters) : '-'} •{' '}
                      {costEstimation.availableCapacityMw} MW dispo
                    </span>
                  </div>

                  <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                    <span className="text-slate-400 text-[10px] block">Distance Réseau HTA</span>
                    <span className="font-extrabold text-white block">{distToHtaMeters} m</span>
                    <span
                      className={`text-[10px] font-bold block ${
                        isInsideCorridor ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {isInsideCorridor ? '✅ Dans corridor 350m' : '⚠️ Hors corridor'}
                    </span>
                  </div>
                </div>

                {/* Detailed Cost Table */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px]">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>
                      Quote-part S3REnR ({costEstimation.qpPerMw} k€/MW) :
                    </span>
                    <span className="font-bold text-white font-mono">
                      {costEstimation.costQuotePart.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Liaison souterraine HTA ({distToHtaMeters} m × 75 €) :</span>
                    <span className="font-bold text-white font-mono">
                      {costEstimation.costLiaison.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Cellule comptage & raccordement Enedis :</span>
                    <span className="font-bold text-white font-mono">
                      {costEstimation.costCelluleEnedis.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Poste de livraison & disjoncteur HTA :</span>
                    <span className="font-bold text-white font-mono">
                      {costEstimation.costPosteLivraison.toLocaleString('fr-FR')} €
                    </span>
                  </div>

                  {/* Total Cost Highlight */}
                  <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between items-center bg-amber-500/10 p-2 rounded-lg border border-amber-500/30">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                        Budget Raccordement Total
                      </span>
                      <span className="text-[10px] text-slate-400">HT indicatif Enedis</span>
                    </div>
                    <span className="text-base font-black text-amber-400 font-mono">
                      {costEstimation.totalCost.toLocaleString('fr-FR')} € HT
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    Délai raccordement :{' '}
                    <strong className="text-white">
                      {costEstimation.isCapacitySufficient ? '6 à 9 mois' : '18 à 36 mois'}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copier l'audit</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
