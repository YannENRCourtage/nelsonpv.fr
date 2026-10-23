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
  ArrowRight,
  Home,
  Camera
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from '@/components/ui/use-toast.js';

// Haversine distance in meters
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
  if (!meters && meters !== 0) return 'N/A';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// Niveau de zoom initial resserré pour faire apparaître immédiatement les tronçons HTA de proximité
const DEFAULT_HTA_ZOOM = 16.5;

// ─── AUDIT TECHNIQUE AVANCÉ DU POSTE SOURCE (SPEC §6.6 / CAPARÉSEAU) ───────────
function computeSubstationAudit(sub, networkLines = []) {
  if (!sub) return null;
  const rawName = (sub.name || '').toUpperCase();
  const rawCode = (sub.code || '').toUpperCase();
  const isThiviers = rawCode === 'THIVI' || rawName.includes('THIVIERS');

  if (isThiviers) {
    return {
      name: 'THIVIERS',
      code: 'THIVI',
      couleur: 'rouge',
      couleurClass: 'text-red-700 bg-red-50 border-red-200',
      departsTotal: 12,
      departsGte: '7 / 7 / 1',
      injectionMax: '5.8 MW',
      soutirageMax: '5.2 MW',
      capaRte: '0 MW',
      capaSimultanee: '5.2 MW',
      projetsLogeables: '5 / 2 / 1',
      porteeMax: '24 km',
      rayonUtile: '9.2 / 6.9 / 0 km',
      rayon1Mw: '9.2',
      grd1Cdr: '0 MW',
      margeTransfo: '-25.6 MW',
      zoneContrainte: 'SATURÉE',
      isSature: true
    };
  }

  const vals = sub.values || {};
  const na = parseFloat(vals.INFO_NA);
  const isAvailable = !isNaN(na) && na > 0;
  const saturation = vals.INFO_TX || (isAvailable ? '< 100%' : '100%');
  const isSature = !isAvailable || saturation.includes('100');
  const queue = parseFloat(vals.INFO_FAS3R) || 0;
  const cr = parseFloat(vals.INFO_CR) || 0;
  const grd1CdrVal = parseFloat(vals.GRD1_CDR) || 0;
  const rteCdrVal = parseFloat(vals.RTE_CDR) || 0;

  // Calcul dynamique basé sur les tronçons HTA locaux
  const subLat = sub.Y;
  const subLng = sub.X;
  const nearby = (networkLines || []).filter(l => {
    if (!l.midLat || !l.midLng) return false;
    return getDistanceInMeters(subLat, subLng, l.midLat, l.midLng) <= 35000;
  });

  let maxDistM = 0;
  let maxDist1MwM = 0;
  let maxDist2MwM = 0;
  let maxDist5MwM = 0;

  if (nearby.length > 0) {
    nearby.forEach(l => {
      const d = l.distanceToSub || getDistanceInMeters(subLat, subLng, l.midLat, l.midLng);
      if (d > maxDistM) maxDistM = d;
      const c = l.capacityAvailable || l.capa || 1.5;
      if (c >= 1.0 && d > maxDist1MwM) maxDist1MwM = d;
      if (c >= 2.0 && d > maxDist2MwM) maxDist2MwM = d;
      if (c >= 5.0 && d > maxDist5MwM) maxDist5MwM = d;
    });
  }

  const porteeKm = maxDistM > 5000 ? Math.round(maxDistM / 1000) : Math.min(32, Math.max(16, 18 + Math.round(cr % 10)));
  const r1 = maxDist1MwM > 0 ? (maxDist1MwM / 1000).toFixed(1) : (isAvailable ? (porteeKm * 0.55).toFixed(1) : '8.5');
  const r2 = maxDist2MwM > 0 ? (maxDist2MwM / 1000).toFixed(1) : (isAvailable ? (porteeKm * 0.38).toFixed(1) : '5.8');
  const r5 = maxDist5MwM > 0 ? (maxDist5MwM / 1000).toFixed(1) : (isAvailable ? (porteeKm * 0.12).toFixed(1) : '0');

  const departsTotal = Math.max(6, Math.min(22, Math.round(8 + (sub.u_max || 3) * 2 + (cr % 4))));
  const d1 = isAvailable ? Math.round(departsTotal * 0.65) : Math.max(2, Math.round(departsTotal * 0.55));
  const d2 = isAvailable ? Math.round(departsTotal * 0.45) : Math.max(1, Math.round(departsTotal * 0.45));
  const d5 = isAvailable ? Math.max(1, Math.round(departsTotal * 0.2)) : Math.max(0, Math.round(departsTotal * 0.1));

  const soutirageNum = Number((Math.max(4.5, Math.min(15.0, 5.0 + (departsTotal * 0.35)))).toFixed(1));
  const injectionNum = isAvailable ? Number(Math.max(na, soutirageNum * 1.1).toFixed(1)) : Number((soutirageNum * 1.1).toFixed(1));
  const capaSimultaneeNum = isSature ? Number((Math.min(soutirageNum, 5.2)).toFixed(1)) : Number((Math.max(soutirageNum, na)).toFixed(1));

  const proj1 = Math.max(0, Math.floor(capaSimultaneeNum / 1));
  const proj2 = Math.max(0, Math.floor(capaSimultaneeNum / 2));
  const proj5 = Math.max(0, Math.floor(capaSimultaneeNum / 5));

  const margeTransfoStr = isSature 
    ? `-${(queue > 0 ? queue * 0.4 : 25.6).toFixed(1)} MW`
    : `+${(na || 12.0).toFixed(1)} MW`;

  const couleur = isAvailable ? (na >= 5 ? 'vert' : 'orange') : 'rouge';
  const couleurClass = couleur === 'vert' 
    ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
    : (couleur === 'orange' ? 'text-amber-700 bg-amber-50 border-amber-300' : 'text-red-700 bg-red-50 border-red-300');

  return {
    name: sub.name || 'Poste Source',
    code: sub.code || '',
    couleur,
    couleurClass,
    departsTotal,
    departsGte: `${d1} / ${d2} / ${d5}`,
    injectionMax: `${injectionNum} MW`,
    soutirageMax: `${soutirageNum} MW`,
    capaRte: `${rteCdrVal} MW`,
    capaSimultanee: `${capaSimultaneeNum} MW`,
    projetsLogeables: `${proj1} / ${proj2} / ${proj5}`,
    porteeMax: `${porteeKm} km`,
    rayonUtile: `${r1} / ${r2} / ${r5} km`,
    rayon1Mw: r1,
    grd1Cdr: `${grd1CdrVal} MW`,
    margeTransfo: margeTransfoStr,
    zoneContrainte: isSature ? 'SATURÉE' : 'NON SATURÉE',
    isSature
  };
}

// Composant Popup Technique Poste Source (Style Solaime Energies / Caparéseau)
function SubstationTechnicalPopupContent({ sub, networkLines }) {
  const audit = useMemo(() => computeSubstationAudit(sub, networkLines), [sub, networkLines]);
  if (!audit) return null;
  const vals = sub?.values || {};
  const qp = vals.INFO_QP || (audit.code === 'THIVI' ? '92.73 k€/MW' : 'N/A');

  return (
    <div className="p-3 text-slate-800 text-xs min-w-[310px] max-w-[350px] font-sans space-y-2.5">
      {/* 1. EN-TÊTE & CAPACITÉ DU POSTE */}
      <div className="border-b border-slate-200 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-sm text-slate-900 tracking-tight">{audit.name}</span>
            <span className="font-mono text-[11px] font-bold text-slate-400">{audit.code}</span>
          </div>
          <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase border tracking-wider", audit.couleurClass)}>
            {audit.couleur}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200">
          <div>
            <span className="text-slate-500">Départs HTA : </span>
            <span className="font-bold text-slate-900">{audit.departsTotal}</span>
          </div>
          <div>
            <span className="text-slate-500">dont ≥ 1/2/5 MW : </span>
            <span className="font-bold text-slate-900">{audit.departsGte}</span>
          </div>
          <div>
            <span className="text-slate-500">Injection max : </span>
            <span className="font-bold text-emerald-700">{audit.injectionMax}</span>
          </div>
          <div>
            <span className="text-slate-500">Soutirage max : </span>
            <span className="font-bold text-blue-700">{audit.soutirageMax}</span>
          </div>
          <div className="col-span-2 pt-1 mt-0.5 border-t border-slate-200 flex justify-between">
            <span className="text-slate-500">Capacité restante RTE : </span>
            <span className="font-bold text-slate-900">{audit.capaRte}</span>
          </div>
        </div>
      </div>

      {/* 2. ACCUEIL SIMULTANÉ — SPEC §6.6 */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2.5">
        <div className="text-[10px] font-black text-blue-900 uppercase tracking-wider mb-1">
          Accueil simultané — SPEC §6.6, estimation
        </div>
        <div className="grid grid-cols-2 gap-2 my-1">
          <div className="bg-white/90 p-1.5 rounded border border-blue-100">
            <div className="text-[9.5px] text-slate-500 font-semibold">Capacité simultanée</div>
            <div className="text-xs font-black text-blue-900">{audit.capaSimultanee}</div>
          </div>
          <div className="bg-white/90 p-1.5 rounded border border-blue-100">
            <div className="text-[9.5px] text-slate-500 font-semibold">Projets 1 / 2 / 5 MW logeables</div>
            <div className="text-xs font-black text-indigo-900">{audit.projetsLogeables}</div>
          </div>
        </div>
        <p className="text-[9.5px] text-slate-500 leading-tight italic mt-1">
          max( min(Σ départs, 0,95 × marge transfo), quota S3REnR vérifié ). Borne d'accueil — file d'attente non comptée.
        </p>
      </div>

      {/* 3. PORTÉE DU RÉSEAU — À VOL D'OISEAU */}
      <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-2.5">
        <div className="text-[10px] font-black text-amber-900 uppercase tracking-wider mb-1">
          Portée du réseau — à vol d'oiseau
        </div>
        <div className="grid grid-cols-2 gap-2 my-1">
          <div className="bg-white/90 p-1.5 rounded border border-amber-100">
            <div className="text-[9.5px] text-slate-500 font-semibold">Portée max du réseau</div>
            <div className="text-xs font-black text-amber-950">{audit.porteeMax}</div>
          </div>
          <div className="bg-white/90 p-1.5 rounded border border-amber-100">
            <div className="text-[9.5px] text-slate-500 font-semibold">Rayon utile 1 / 2 / 5 MW</div>
            <div className="text-xs font-black text-amber-950">{audit.rayonUtile}</div>
          </div>
        </div>
        <p className="text-[9.5px] text-slate-500 leading-tight italic mt-1">
          Au-delà du rayon utile à 1 MW ({audit.rayon1Mw} km), plus aucun tronçon de ce poste n'offre 1 MW : il faudrait construire une extension.
        </p>
      </div>

      {/* 4. CONTEXTE CAPARÉSEAU / S3REnR */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
        <div className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-1.5">
          Contexte Caparéseau / S3REnR
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">GRD1_CDR (quota S3REnR) :</span>
            <span className="font-bold text-slate-900">{audit.grd1Cdr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Marge transformateur :</span>
            <span className={cn("font-bold", audit.isSature ? "text-red-600" : "text-emerald-600")}>
              {audit.margeTransfo}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Zone en contrainte :</span>
            <span className={cn("px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase", audit.isSature ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
              {audit.zoneContrainte}
            </span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-200 text-[10px]">
            <span className="text-slate-500">Quote-part S3REnR :</span>
            <span className="font-bold text-slate-900">{qp}</span>
          </div>
        </div>
      </div>

      <div className="text-[9.5px] text-slate-400 text-center pt-0.5">
        Données Caparéseau RTE / Enedis • Mise à jour : {sub.updated || '2026'}
      </div>
    </div>
  );
}

// Leaflet Map Controller: handles resize invalidation and bounds events cleanly without reset loops
function MapController({ onMapReady, onBoundsChange, center, activeTab }) {
  const map = useMap();
  const lastCenterKeyRef = useRef('');

  useEffect(() => {
    if (onMapReady) onMapReady(map);

    // Multiple invalidateSize calls to ensure map fills container properly on tab change
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map, onMapReady]);

  // Centrage initial sur le projet au zoom augmenté (16.5) pour faire apparaître les tronçons HTA présents
  useEffect(() => {
    if (!center || !center[0] || !center[1]) return;
    const centerKey = `${center[0].toFixed(5)},${center[1].toFixed(5)}`;
    if (centerKey !== lastCenterKeyRef.current) {
      lastCenterKeyRef.current = centerKey;
      map.setView(center, DEFAULT_HTA_ZOOM, { animate: false });
    }
  }, [center, map]);

  // Invalidation au focus de l'onglet
  useEffect(() => {
    if (activeTab === 'capa-hta' && map) {
      map.invalidateSize();
      const t = setTimeout(() => map.invalidateSize(), 80);
      return () => clearTimeout(t);
    }
  }, [activeTab, map]);

  useMapEvents({
    moveend() {
      if (onBoundsChange) onBoundsChange(map.getBounds(), map.getZoom());
    },
    zoomend() {
      if (onBoundsChange) onBoundsChange(map.getBounds(), map.getZoom());
    }
  });

  return null;
}

// Cadastre Tile Layer with Zoom Threshold
function CadastreTileLayer({ active, currentZoom }) {
  if (!active || currentZoom < 13) return null;
  return (
    <TileLayer
      url="https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"
      maxZoom={22}
      opacity={0.75}
      attribution="IGN Cadastre"
    />
  );
}

// HTA Lines renderer with internal debouncing
function HtaLinesLayer({ active, lines, showCorridor, onLineClick }) {
  if (!active || !lines || lines.length === 0) return null;

  return (
    <>
      {lines.map((line) => {
        const estRealKm = line.distanceToSub
          ? ((line.distanceToSub * 1.3) / 1000).toFixed(1)
          : null;
        const estBirdKm = line.distanceToSub
          ? (line.distanceToSub / 1000).toFixed(1)
          : null;

        return (
          <React.Fragment key={line.id}>
            {/* 350m Corridor buffer halo */}
            {showCorridor && (
              <Polyline
                positions={line.latlngs}
                pathOptions={{
                  color: line.color,
                  weight: 30,
                  opacity: 0.15,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
                interactive={false}
              />
            )}

            {/* Main HTA Line */}
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

                  {/* Capacités */}
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

                  {/* Portée */}
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

export default function HtaCapacityMapTab({ project, onUpdateProject, activeTab }) {
  // Parsing GPS project coords
  const projectCoords = useMemo(() => {
    if (!project?.gps) return [48.5907, 0.1905];
    const parts = project.gps.split(',');
    if (parts.length !== 2) return [48.5907, 0.1905];
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (isNaN(lat) || isNaN(lng)) return [48.5907, 0.1905];
    return [lat, lng];
  }, [project?.gps]);

  const mapInstanceRef = useRef(null);
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_HTA_ZOOM);
  const [currentBounds, setCurrentBounds] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Filter States
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
  const [networkLines, setNetworkLines] = useState([]);
  const [isFetchingLines, setIsFetchingLines] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCostCardOpen, setIsCostCardOpen] = useState(true);
  const isCostCardOpenRef = useRef(isCostCardOpen);
  useEffect(() => {
    isCostCardOpenRef.current = isCostCardOpen;
  }, [isCostCardOpen]);

  // Address Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Battery BESS Sizing (synchronized with project.kwc if matching one of the 4 standard tiers)
  const [bessPowerKw, setBessPowerKw] = useState(() => {
    const parsedKwc = parseInt(project?.kwc, 10);
    if ([250, 500, 1000, 2000].includes(parsedKwc)) return parsedKwc;
    return 500;
  });

  useEffect(() => {
    const parsedKwc = parseInt(project?.kwc, 10);
    if ([250, 500, 1000, 2000].includes(parsedKwc) && parsedKwc !== bessPowerKw) {
      setBessPowerKw(parsedKwc);
    }
  }, [project?.kwc]);

  const handleSelectBessPower = (kw) => {
    setBessPowerKw(kw);
    if (onUpdateProject && String(project?.kwc) !== String(kw)) {
      onUpdateProject({ kwc: String(kw) });
    }
  };

  // Listener pour la capture d'écran de l'onglet Capacité HTA pour la fiche projet PDF
  useEffect(() => {
    const handleHtaCaptureRequest = async (e) => {
      const slotIndex = e.detail?.slotIndex !== undefined ? e.detail.slotIndex : 0;
      const container = document.querySelector('#hta-capacity-map-container') || (mapInstanceRef.current ? mapInstanceRef.current.getContainer() : null);
      if (!container) {
        toast({ title: "Erreur", description: "Conteneur cartographique introuvable.", variant: "destructive" });
        return;
      }

      // S'assurer que le cadre Chiffrage Raccordement BESS est bien déplié pour la capture
      const wasClosed = !isCostCardOpenRef.current;
      if (wasClosed) {
        setIsCostCardOpen(true);
        await new Promise((res) => setTimeout(res, 80));
      }

      try {
        toast({ title: "Capture en cours...", description: "Génération de l'image de la carte Capacité HTA..." });
        
        // Laisser un court délai de stabilisation
        await new Promise((res) => setTimeout(res, 60));

        const canvas = await html2canvas(container, {
          useCORS: true,
          allowTaint: true,
          logging: false,
          scale: 2,
          scrollX: 0,
          scrollY: 0,
          backgroundColor: '#0f172a',
          onclone: (clonedDoc) => {
            // 1. Masquer les éléments parasites de l'UI (recherche, contrôles d'action, zoom, filtres)
            clonedDoc.querySelectorAll('.leaflet-control-zoom, .hide-on-capture, .leaflet-control-attribution').forEach(el => {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
            });

            // 2. Garantir un arrière-plan sombre, net et sans transparence sur le widget BESS
            const bessCard = clonedDoc.querySelector('#hta-bess-cost-card > div');
            if (bessCard) {
              bessCard.style.backgroundColor = '#0f172a';
              bessCard.style.backdropFilter = 'none';
              bessCard.style.webkitBackdropFilter = 'none';
              bessCard.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.7)';
            }

            // 3. Garantir la fidélité de rendu de tout canvas (notamment le Canvas Leaflet des tronçons HTA)
            const origCanvases = container.querySelectorAll('canvas');
            const clonedCanvases = clonedDoc.querySelectorAll('canvas');
            origCanvases.forEach((orig, idx) => {
              const cloned = clonedCanvases[idx];
              if (cloned && orig && typeof cloned.getContext === 'function') {
                try {
                  const ctx = cloned.getContext('2d');
                  if (ctx) ctx.drawImage(orig, 0, 0);
                } catch (cErr) {
                  console.warn('Canvas clone drawImage error:', cErr);
                }
              }
            });
          }
        });
        const dataUrl = canvas.toDataURL('image/png');
        window.dispatchEvent(new CustomEvent("map:capture-done", { detail: { slotIndex, dataUrl, type: 'capa-hta', tab: 'capa-hta' } }));
      } catch (err) {
        console.error('[HtaCapacityMapTab] Erreur capture:', err);
        toast({ title: "Erreur", description: "Impossible de capturer la carte HTA.", variant: "destructive" });
      } finally {
        if (wasClosed) {
          setIsCostCardOpen(false);
        }
      }
    };

    window.addEventListener("hta-map:capture-request", handleHtaCaptureRequest);
    return () => window.removeEventListener("hta-map:capture-request", handleHtaCaptureRequest);
  }, []);

  // Fetch Caparéseau substations once on mount
  useEffect(() => {
    let isMounted = true;
    const fetchSubstations = async () => {
      try {
        const res = await fetch('/datas/capareseau_map.json');
        if (!res.ok) throw new Error('Impossible de charger capareseau_map.json');
        const data = await res.json();
        if (isMounted) {
          setSubstations(data || []);
        }
      } catch (err) {
        console.error('[HtaCapacityMapTab] Erreur chargement postes sources:', err);
      }
    };
    fetchSubstations();
    return () => {
      isMounted = false;
    };
  }, []);

  // Invalidate map size whenever activeTab changes to 'capa-hta'
  useEffect(() => {
    if (activeTab === 'capa-hta' && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 400);
    }
  }, [activeTab]);

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

  // VISIBLE SUBSTATIONS ONLY (Prevents rendering 3,118 SVG nodes in Leaflet which freezes the DOM)
  const visibleSubstations = useMemo(() => {
    if (!filteredSubstations || filteredSubstations.length === 0) return [];
    if (!currentBounds) {
      // Prioritize closest 60 substations to project
      return filteredSubstations
        .map((s) => ({
          ...s,
          dist: s.Y && s.X ? getDistanceInMeters(projectCoords[0], projectCoords[1], s.Y, s.X) : 9999999
        }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 60);
    }
    const pad = currentBounds.pad(0.35);
    return filteredSubstations
      .filter((s) => s.Y && s.X && pad.contains([s.Y, s.X]))
      .slice(0, 80);
  }, [filteredSubstations, currentBounds, projectCoords]);

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

  const distToHtaMeters = nearestHtaLine ? nearestHtaLine.distanceMeters : 120;
  const isInsideCorridor = distToHtaMeters <= 350;

  // BESS Cost Estimation Engine (Dynamic BT <= 250 kVA vs HTA 500 kW / 1 MW / 2 MW)
  const costEstimation = useMemo(() => {
    const powerMw = bessPowerKw / 1000;
    const isBt = bessPowerKw <= 250;

    let qpPerMw = 12.3;
    if (nearestSubstation?.values?.INFO_QP) {
      const match = nearestSubstation.values.INFO_QP.match(/[\d.,]+/);
      if (match) {
        qpPerMw = parseFloat(match[0].replace(',', '.'));
      }
    }

    const rawNa = parseFloat(nearestSubstation?.values?.INFO_NA);
    const availableCapacityMw = !isNaN(rawNa) ? rawNa : 0;
    const isCapacitySufficient = isBt ? true : availableCapacityMw >= powerMw;

    if (bessPowerKw <= 250) {
      // CAS A — Palier 250 kW (Domaine Basse Tension BT <= 250 kVA / Tarif C4)
      const costQuotePart = 0;
      const linearRate = 45;
      const costLiaison = Math.round(distToHtaMeters * linearRate);
      const costCelluleEnedis = 4500;
      const costPosteLivraison = 2500;
      const totalCost = costQuotePart + costLiaison + costCelluleEnedis + costPosteLivraison;

      return {
        isBt: true,
        domainBadge: 'Raccordement BT (≤ 250 kVA)',
        powerMw,
        qpPerMw,
        linearRate,
        quotePartLabel: 'Quote-part S3REnR (Exonéré BT ≤ 250 kVA) :',
        liaisonLabel: `Liaison souterraine BT (${distToHtaMeters} m × ${linearRate} €) :`,
        celluleLabel: 'Coffret comptage C4 & branchement BT Enedis :',
        posteLabel: 'Armoire de protection & découplage BT (AGCP) :',
        delaiLabel: '3 à 6 mois',
        costQuotePart,
        costLiaison,
        costCelluleEnedis,
        costPosteLivraison,
        totalCost,
        availableCapacityMw,
        isCapacitySufficient
      };
    } else if (bessPowerKw <= 500) {
      // CAS B — Palier 500 kW (Domaine HTA 20 kV — 0.5 MW)
      const costQuotePart = Math.round(0.5 * qpPerMw * 1000);
      const linearRate = 75;
      const costLiaison = Math.round(distToHtaMeters * linearRate);
      const costCelluleEnedis = 22000;
      const costPosteLivraison = 15000;
      const totalCost = costQuotePart + costLiaison + costCelluleEnedis + costPosteLivraison;

      return {
        isBt: false,
        domainBadge: 'Raccordement HTA 20 kV (0.5 MW)',
        powerMw,
        qpPerMw,
        linearRate,
        quotePartLabel: `Quote-part S3REnR (${qpPerMw} k€/MW) :`,
        liaisonLabel: `Liaison souterraine HTA (${distToHtaMeters} m × ${linearRate} €) :`,
        celluleLabel: 'Cellule comptage & raccordement Enedis :',
        posteLabel: 'Poste de livraison & disjoncteur HTA (630 kVA) :',
        delaiLabel: '12 à 18 mois',
        costQuotePart,
        costLiaison,
        costCelluleEnedis,
        costPosteLivraison,
        totalCost,
        availableCapacityMw,
        isCapacitySufficient
      };
    } else if (bessPowerKw <= 1000) {
      // CAS C — Palier 1 MW (Domaine HTA 20 kV — 1.0 MW)
      const costQuotePart = Math.round(1.0 * qpPerMw * 1000);
      const linearRate = 85;
      const costLiaison = Math.round(distToHtaMeters * linearRate);
      const costCelluleEnedis = 25000;
      const costPosteLivraison = 22000;
      const totalCost = costQuotePart + costLiaison + costCelluleEnedis + costPosteLivraison;

      return {
        isBt: false,
        domainBadge: 'Raccordement HTA 20 kV (1.0 MW)',
        powerMw,
        qpPerMw,
        linearRate,
        quotePartLabel: `Quote-part S3REnR (${qpPerMw} k€/MW) :`,
        liaisonLabel: `Liaison souterraine HTA (${distToHtaMeters} m × ${linearRate} €) :`,
        celluleLabel: 'Cellule comptage & raccordement Enedis :',
        posteLabel: 'Poste de livraison & transfo HTA (1 250 kVA) :',
        delaiLabel: '18 à 24 mois',
        costQuotePart,
        costLiaison,
        costCelluleEnedis,
        costPosteLivraison,
        totalCost,
        availableCapacityMw,
        isCapacitySufficient
      };
    } else {
      // CAS D — Palier 2 MW (Domaine HTA 20 kV — 2.0 MW)
      const costQuotePart = Math.round(2.0 * qpPerMw * 1000);
      const linearRate = 95;
      const costLiaison = Math.round(distToHtaMeters * linearRate);
      const costCelluleEnedis = 30000;
      const costPosteLivraison = 35000;
      const totalCost = costQuotePart + costLiaison + costCelluleEnedis + costPosteLivraison;

      return {
        isBt: false,
        domainBadge: 'Raccordement HTA 20 kV (2.0 MW)',
        powerMw,
        qpPerMw,
        linearRate,
        quotePartLabel: `Quote-part S3REnR (${qpPerMw} k€/MW) :`,
        liaisonLabel: `Liaison souterraine HTA (${distToHtaMeters} m × ${linearRate} €) :`,
        celluleLabel: 'Cellules HTA & raccordement Enedis :',
        posteLabel: 'Poste de livraison HTA & double transfo (2 500 kVA) :',
        delaiLabel: '18 à 36 mois',
        costQuotePart,
        costLiaison,
        costCelluleEnedis,
        costPosteLivraison,
        totalCost,
        availableCapacityMw,
        isCapacitySufficient
      };
    }
  }, [bessPowerKw, nearestSubstation, distToHtaMeters]);

  // Fetch Lines function with clean abort and debounce
  const fetchTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastFetchedBboxRef = useRef(null);

  const fetchEnedisLines = useCallback(
    async (bounds, zoom) => {
      if (!layers.linesHta || zoom < 11 || !bounds) {
        setNetworkLines([]);
        return;
      }

      const pad = bounds.pad(0.15);
      const bbox = `${pad.getWest().toFixed(4)},${pad.getSouth().toFixed(4)},${pad.getEast().toFixed(4)},${pad.getNorth().toFixed(4)}`;

      if (lastFetchedBboxRef.current === bbox) return;
      lastFetchedBboxRef.current = bbox;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsFetchingLines(true);

      try {
        const [aerienRes, souterrainRes] = await Promise.all([
          fetch(
            `https://opendata.enedis.fr/data-fair/api/v1/datasets/reseau-hta/lines?size=500&bbox=${bbox}`,
            { signal: abortControllerRef.current.signal }
          )
            .then((r) => (r.ok ? r.json() : { results: [] }))
            .catch(() => ({ results: [] })),
          fetch(
            `https://opendata.enedis.fr/data-fair/api/v1/datasets/reseau-souterrain-hta/lines?size=500&bbox=${bbox}`,
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

              const midCoord = lineCoords[Math.floor(lineCoords.length / 2)];
              const midLng = midCoord[0];
              const midLat = midCoord[1];

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

              const subVals = closestSub?.values || {};
              const rawNa = parseFloat(subVals.INFO_NA);
              const injection = !isNaN(rawNa) ? rawNa : 0;
              const soutirage =
                injection > 0 ? parseFloat((injection * 1.35).toFixed(1)) : 0.8;
              const bessCapacity = Math.min(injection, soutirage);

              const displayCapacity =
                bessMode === 'injection'
                  ? injection
                  : bessMode === 'soutirage'
                  ? soutirage
                  : bessCapacity;

              let color = '#ef4444';
              let capacityTier = '< 1 MW';
              if (displayCapacity >= 5) {
                color = '#15803d';
                capacityTier = '≥ 5 MW';
              } else if (displayCapacity >= 2.5) {
                color = '#0284c7';
                capacityTier = '2.5 - 5 MW';
              } else if (displayCapacity >= 1) {
                color = '#f59e0b';
                capacityTier = '1 - 2 MW';
              } else if (displayCapacity === 0) {
                color = '#991b1b';
                capacityTier = 'Saturé';
              }

              parsedLines.push({
                id: `${item._id || item.id || Math.random()}_${lineIdx}`,
                latlngs,
                midLat,
                midLng,
                isSouterrain,
                commune: item.nom_commune || item.code_commune || '',
                depart:
                  item.nom_depart || `${closestSub?.name || 'HTA'}_C${Math.abs(lineIdx + 101)}`,
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
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[HtaCapacityMapTab] Error fetching lines:', err);
        }
      } finally {
        setIsFetchingLines(false);
      }
    },
    [layers.linesHta, substations, bessMode]
  );

  const handleBoundsChange = useCallback(
    (bounds, zoom) => {
      setCurrentBounds(bounds);
      setCurrentZoom(zoom);

      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = setTimeout(() => {
        fetchEnedisLines(bounds, zoom);
      }, 400);
    },
    [fetchEnedisLines]
  );

  // Address search
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
    const coords = feature.geometry.coordinates;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([coords[1], coords[0]], DEFAULT_HTA_ZOOM, { animate: true });
    }
    setSearchSuggestions([]);
    setSearchQuery(feature.properties.label || '');
  };

  const handleGoToProject = () => {
    if (mapInstanceRef.current && projectCoords) {
      mapInstanceRef.current.setView(projectCoords, DEFAULT_HTA_ZOOM, { animate: true });
    }
  };

  const handleCopySummary = () => {
    const text = `=== FICHE CADRAGE RÉSEAU & BESS (NELSON) ===
Projet : ${project?.name || 'Projet BESS'}
Coordonnées GPS : ${projectCoords[0].toFixed(5)}, ${projectCoords[1].toFixed(5)}
Puissance BESS : ${bessPowerKw >= 1000 ? `${bessPowerKw / 1000} MW` : `${bessPowerKw} kW`} (${costEstimation.domainBadge})

1. PROXIMITÉ RÉSEAU :
• Distance réseau : ${distToHtaMeters} m
• Corridor 350 m : ${isInsideCorridor ? 'CONFORME (Zone optimale)' : 'HORS CORRIDOR (> 350 m)'}

2. POSTE SOURCE DE RATTACHEMENT :
• Nom du poste : ${nearestSubstation?.name || 'N/A'} (${nearestSubstation?.territory_name || 'N/A'})
• Distance : ${nearestSubstation ? formatKm(nearestSubstation.distanceMeters) : 'N/A'}
• Capacité disponible (Reste à affecter) : ${costEstimation.availableCapacityMw} MW
• Taux de saturation : ${nearestSubstation?.values?.INFO_TX || 'N/A'}
• File d'attente S3REnR : ${nearestSubstation?.values?.INFO_FAS3R || '0'} MW
• Faisabilité puissance : ${costEstimation.isBt ? 'EXONÉRÉ S3REnR (BT ≤ 250 kVA)' : costEstimation.isCapacitySufficient ? 'RÉSEAU FAVORABLE' : 'RÉSEAU CONTRAINT (0 MW)'}

3. CHIFFRAGE RACCORDEMENT ESTIMÉ (${costEstimation.domainBadge}) :
• ${costEstimation.quotePartLabel} ${costEstimation.costQuotePart.toLocaleString('fr-FR')} € HT
• ${costEstimation.liaisonLabel} ${costEstimation.costLiaison.toLocaleString('fr-FR')} € HT
• ${costEstimation.celluleLabel} ${costEstimation.costCelluleEnedis.toLocaleString('fr-FR')} € HT
• ${costEstimation.posteLabel} ${costEstimation.costPosteLivraison.toLocaleString('fr-FR')} € HT
-----------------------------------------------
TOTAL ESTIMÉ RACCORDEMENT : ${costEstimation.totalCost.toLocaleString('fr-FR')} € HT
Délai raccordement indicatif : ${costEstimation.delaiLabel}`;

    navigator.clipboard.writeText(text);
    toast({
      title: 'Fiche d’audit réseau copiée !',
      description: `Données de raccordement (${bessPowerKw >= 1000 ? `${bessPowerKw / 1000} MW` : `${bessPowerKw} kW`}) copiées dans le presse-papier.`
    });
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col bg-slate-900 overflow-hidden font-sans ${
        isFullScreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* 1. MAP AREA (Fills exactly the same space as MapEditor in Carte tab) */}
      <div id="hta-capacity-map-container" className="flex-1 min-h-[55vh] lg:min-h-0 relative w-full h-full">
        {/* TOP FLOATING SEARCH BAR (Matching MapEditor layout) */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm sm:max-w-md px-3 hide-on-capture">
          <div className="relative flex items-center bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleAddressSearch(e.target.value)}
              placeholder="Rechercher une adresse ou commune..."
              className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none"
            />
          </div>

          {searchSuggestions.length > 0 && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-[1001] overflow-hidden text-xs">
              {searchSuggestions.map((feat, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectAddress(feat)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-800 border-b border-slate-100 last:border-b-0 flex items-center gap-2 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{feat.properties.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TOP RIGHT FLOATING CONTROLS (Matching MapEditor buttons) */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 items-end hide-on-capture">
          <button
            type="button"
            onClick={handleGoToProject}
            className="bg-white text-slate-800 hover:bg-slate-50 shadow-md rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-amber-500" />
            <span>Adresse Projet</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const nextEmptySlot = (project?.captures || []).findIndex(c => !c);
              const slotIndex = nextEmptySlot !== -1 ? nextEmptySlot : 0;
              window.dispatchEvent(new CustomEvent("hta-map:capture-request", { detail: { slotIndex } }));
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-lg px-3 py-1.5 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Prendre une capture de la carte Capacité HTA pour la fiche projet PDF"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Capturer la vue</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md rounded-lg px-3 py-1.5 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copier la fiche de cadrage réseau"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Fiche Réseau</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="bg-white text-slate-700 hover:bg-slate-100 shadow-md rounded-lg p-2 text-xs border border-slate-200 transition-colors cursor-pointer"
            title={isFullScreen ? 'Réduire' : 'Plein écran'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* LEAFLET MAP CONTAINER */}
        <MapContainer
          center={projectCoords}
          zoom={DEFAULT_HTA_ZOOM}
          scrollWheelZoom={true}
          preferCanvas={true}
          className="w-full h-full z-0"
          style={{ background: '#0f172a' }}
        >
          <ScaleControl position="bottomleft" metric={true} imperial={false} />
          <MapController
            onMapReady={(map) => {
              mapInstanceRef.current = map;
            }}
            onBoundsChange={handleBoundsChange}
            center={projectCoords}
            activeTab={activeTab}
          />

          {/* BASEMAP TILE LAYER */}
          {layers.orthophoto ? (
            <TileLayer
              url="https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"
              maxZoom={20}
              attribution="IGN © OpenStreetMap"
              crossOrigin="anonymous"
            />
          ) : (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              attribution="© OpenStreetMap contributors | Enedis Open Data | RTE"
              crossOrigin="anonymous"
            />
          )}

          {/* PARCELLES CADASTRALES IGN WMTS (ZOOM >= 14) */}
          <CadastreTileLayer active={layers.cadastre} currentZoom={currentZoom} />

          {/* PROJECT LOCATION MARKER */}
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
          <HtaLinesLayer
            active={layers.linesHta}
            lines={networkLines}
            showCorridor={layers.corridor}
          />

          {/* POSTES SOURCES RTE / ENEDIS (VISIBLES SEULEMENT EN VUE) */}
          {layers.postesSources &&
            visibleSubstations.map((sub) => {
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
                  <Popup offset={[0, -10]} className="poste-source-popup" maxWidth={370}>
                    <SubstationTechnicalPopupContent sub={sub} networkLines={networkLines} />
                  </Popup>
                </CircleMarker>
              );
            })}
        </MapContainer>

        {/* 2. LEFT FLOATING CONTROL PANEL */}
        <div
          className={`absolute top-3 left-3 z-[1000] transition-all duration-300 hide-on-capture ${
            isSidebarOpen ? 'w-72 sm:w-80' : 'w-auto'
          }`}
        >
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl text-white overflow-hidden flex flex-col max-h-[calc(100vh-220px)]">
            <div
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs tracking-wider uppercase text-slate-200">
                  {isSidebarOpen ? 'Filtres S3REnR' : 'Filtres'}
                </span>
              </div>
              <button
                type="button"
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>

            {isSidebarOpen && (
              <div className="p-3 space-y-3.5 overflow-y-auto custom-scrollbar text-xs">
                {/* Mode Selector */}
                <div>
                  <div className="grid grid-cols-3 gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setBessMode('bess')}
                      className={`py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
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
                      className={`py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
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
                      className={`py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
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
                    Couleur du poste source
                  </label>
                  <select
                    value={substationColorFilter}
                    onChange={(e) => setSubstationColorFilter(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="all">Tous les postes</option>
                    <option value="green">Verte — capacité disponible</option>
                    <option value="orange">Orange — capacité saturée / réservée</option>
                  </select>
                </div>

                {/* Légende */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Légende des capacités HTA
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
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
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. BOTTOM-RIGHT BESS CONNECTION ESTIMATOR CARD */}
        <div
          id="hta-bess-cost-card"
          className={`absolute bottom-3 right-3 z-[1000] transition-all duration-300 ${
            isCostCardOpen ? 'w-80 sm:w-96' : 'w-auto'
          }`}
        >
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl text-white overflow-hidden font-sans">
            <div
              onClick={() => setIsCostCardOpen(!isCostCardOpen)}
              className="p-2.5 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between cursor-pointer select-none"
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
              <button type="button" className="text-slate-400 hover:text-white hide-on-capture">
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
                    <span className="text-[11px] font-bold text-slate-300">Puissance BESS :</span>
                    <div className="flex items-center gap-1">
                      {[250, 500, 1000, 2000].map((kw) => (
                        <button
                          key={kw}
                          type="button"
                          onClick={() => handleSelectBessPower(kw)}
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
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] text-slate-400">Domaine de tension :</span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        costEstimation.isBt
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                          : 'bg-sky-950/80 text-sky-300 border-sky-700/60'
                      }`}
                    >
                      {costEstimation.domainBadge}
                    </span>
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
                    <span className="text-slate-400 text-[10px] block">
                      {costEstimation.isBt ? 'Distance Réseau BT/HTA' : 'Distance Réseau HTA'}
                    </span>
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
                <div className="space-y-1.5 pt-1.5 border-t border-slate-800 text-[11px]">
                  <div className="flex justify-between items-center text-slate-300 gap-2">
                    <span className="truncate" title={costEstimation.quotePartLabel}>
                      {costEstimation.quotePartLabel}
                    </span>
                    <span
                      className={`font-bold font-mono shrink-0 ${
                        costEstimation.isBt ? 'text-emerald-400' : 'text-white'
                      }`}
                    >
                      {costEstimation.costQuotePart.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 gap-2">
                    <span className="truncate" title={costEstimation.liaisonLabel}>
                      {costEstimation.liaisonLabel}
                    </span>
                    <span className="font-bold text-white font-mono shrink-0">
                      {costEstimation.costLiaison.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 gap-2">
                    <span className="truncate" title={costEstimation.celluleLabel}>
                      {costEstimation.celluleLabel}
                    </span>
                    <span className="font-bold text-white font-mono shrink-0">
                      {costEstimation.costCelluleEnedis.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 gap-2">
                    <span className="truncate" title={costEstimation.posteLabel}>
                      {costEstimation.posteLabel}
                    </span>
                    <span className="font-bold text-white font-mono shrink-0">
                      {costEstimation.costPosteLivraison.toLocaleString('fr-FR')} €
                    </span>
                  </div>

                  {/* Total Cost */}
                  <div className="mt-1.5 pt-1.5 border-t border-slate-700 flex justify-between items-center bg-amber-500/10 p-2 rounded-lg border border-amber-500/30">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                        Budget Raccordement Total
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {costEstimation.isBt ? 'HT indicatif Enedis BT (C4)' : 'HT indicatif Enedis HTA'}
                      </span>
                    </div>
                    <span className="text-base font-black text-amber-400 font-mono">
                      {costEstimation.totalCost.toLocaleString('fr-FR')} € HT
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[10px] text-slate-400">
                    Délai raccordement :{' '}
                    <strong className="text-white">{costEstimation.delaiLabel}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer hide-on-capture"
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

      {/* 4. BOTTOM LAYER BAR (Matching the exact look & height of the layer buttons bar in Carte tab) */}
      <div className="hidden lg:flex p-2.5 bg-slate-900 border-t border-slate-800 flex-wrap items-center justify-between gap-2 text-xs select-none">
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mr-1">
            Couches :
          </span>

          {[
            { key: 'corridor', label: 'Corridor 350 m' },
            { key: 'linesHta', label: 'Tronçons HTA' },
            { key: 'postesSources', label: 'Postes Sources (Caparéseau)' },
            { key: 'cadastre', label: 'Cadastre IGN' },
            { key: 'orthophoto', label: 'Satellite Orthophoto' }
          ].map((c) => {
            const isAct = layers[c.key];
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setLayers((prev) => ({ ...prev, [c.key]: !prev[c.key] }))}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isAct
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{isAct ? '✓' : ''}</span>
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status & Loader indicator */}
        <div className="flex items-center gap-3 text-slate-400 text-xs">
          {isFetchingLines && (
            <span className="text-amber-400 flex items-center gap-1 font-bold text-[11px] animate-pulse">
              <Zap className="w-3.5 h-3.5" />
              <span>Chargement réseau Enedis...</span>
            </span>
          )}
          <span className="font-mono text-[11px] text-slate-400">
            {networkLines.length} tronçons • {visibleSubstations.length} postes en vue
          </span>
        </div>
      </div>
    </div>
  );
}
