import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ---------------------------------------------------------------------------
// Dictionnaire EXHAUSTIF des codes de cultures RPG → libellés français
// Source : ASP / Notices techniques cultures PAC (millésimes 2010-2024)
// Inclut les cultures principales, cultures dérobées et mélanges fourragers
// ---------------------------------------------------------------------------
const RPG_CULTURE_CODES = {

  // ── CÉRÉALES PRINCIPALES ──────────────────────────────────────────────────
  'BLE': 'Blé tendre',
  'BTH': 'Blé tendre',
  'BDH': 'Blé dur',
  'DUR': 'Blé dur',
  'ORH': "Orge d'hiver",
  'OH':  "Orge d'hiver",
  'OP':  'Orge de printemps',
  'ORP': 'Orge de printemps',
  'MID': 'Maïs grain et ensilage',
  'MIS': 'Maïs semence',
  'MIG': 'Maïs grain',
  'MIE': 'Maïs ensilage',
  'MIC': 'Maïs doux',
  'TRN': 'Triticale',
  'SOR': 'Sorgho',
  'SOG': 'Sorgho grain',
  'SEI': 'Seigle',
  'AVO': 'Avoine',
  'AVP': 'Avoine de printemps',
  'ESC': 'Escourgeon',
  'EPE': 'Épeautre',
  'ANC': 'Autres céréales',
  'CER': 'Autres céréales',
  'CZH': 'Céréales (autre)',
  'MCR': 'Mélange de céréales',
  'SNB': 'Sarrasin',
  'MIL': 'Millet',
  'SBL': 'Sorgho blanc',

  // ── OLÉAGINEUX ────────────────────────────────────────────────────────────
  'COL': 'Colza',
  'CPL': 'Colza de printemps',
  'TOU': 'Tournesol',
  'LIN': 'Lin oléagineux',
  'SOJ': 'Soja',
  'LIO': 'Lin oléagineux',
  'POL': 'Autres oléagineux',
  'CAM': 'Cameline',
  'SES': 'Sésame',
  'RIC': 'Ricin',

  // ── PROTÉAGINEUX ──────────────────────────────────────────────────────────
  'POI': 'Pois protéagineux',
  'PHI': "Pois d'hiver",
  'FXL': 'Féverole',
  'FVL': 'Féverole',
  'LUP': 'Lupin doux',
  'PPR': 'Autres protéagineux',
  'LEN': 'Lentille',
  'PTC': 'Pois chiche',
  'PCH': 'Pois chiche',

  // ── PRAIRIES PERMANENTES ──────────────────────────────────────────────────
  'PPH': 'Prairies permanentes herbacées',
  'PPE': 'Prairies permanentes',
  'PRE': 'Prairie permanente',
  'PRL': 'Prairie permanente à flore variée',
  'PRG': 'Prairie permanente riche en espèces',
  'STH': 'Surfaces toujours en herbe',
  'PPD': 'Prairie permanente',

  // ── SURFACES PASTORALES ───────────────────────────────────────────────────
  'SPH': 'Surface pastorale herbacée',
  'SPL': 'Surface pastorale ligneuse',
  'SPA': 'Surface pastorale',
  'APH': 'Autres prairies permanentes herbacées',
  'APL': 'Autres surfaces pastorales ligneuses',

  // ── PRAIRIES TEMPORAIRES (cultures principales) ───────────────────────────
  'PTH': 'Prairies temporaires',
  'PTE': 'Prairies temporaires',
  'PTR': 'Prairies temporaires (autre)',
  'TTH': 'Terres labourables en herbe',
  'FOU': 'Fourrage',
  'FAG': 'Fourrage annuel',
  'PTV': 'Pâturage temporaire des zones humides',
  'MLG': 'Mélange légumineuses et graminées fourragères',
  'MLL': 'Mélange de légumineuses',
  'MLC': 'Mélange de cultures (couvert)',
  'MC6': 'Mélange de cultures',
  'MPC': 'Mélange de protéagineux et céréales',
  'MH5': 'Mélange herbacé (5 ans ou plus)',

  // ── GRAMINÉES FOURRAGÈRES (cultures principales et dérobées) ─────────────
  'RAY': 'Ray-grass',
  'RGA': 'Ray-grass anglais',
  'RGH': 'Ray-grass hybride',
  'RGI': 'Ray-grass italien',
  'DRG': 'Ray-grass (culture dérobée)',
  'DAC': 'Dactyle',
  'DTY': 'Dactyle (prairie temporaire)',
  'FES': 'Fétuque',
  'FET': 'Fétuque des prés',
  'FEE': 'Fétuque élevée',
  'FLE': 'Fléole des prés',
  'FLO': 'Fléole (prairie temporaire)',
  'BRO': 'Brome',
  'PAT': 'Pâturin commun',
  'AGR': 'Agrostis',
  'FLV': 'Fléole et fétuque mélange',

  // ── LÉGUMINEUSES FOURRAGÈRES (cultures principales et dérobées) ───────────
  'LUZ': 'Luzerne',
  'LUS': 'Luzerne',
  'LU6': 'Luzerne (6 ans ou plus)',
  'TRF': 'Trèfle',
  'TRE': 'Trèfle (autre)',
  'DTR': 'Trèfle (culture dérobée)',
  'SAI': 'Sainfoin',
  'TRB': 'Trèfle blanc',
  'TRV': 'Trèfle violet',
  'TRI': 'Trèfle incarnat',
  'TRA': 'Trèfle alexandrie',
  'VCI': 'Vesce',
  'DVS': 'Vesce (culture dérobée)',
  'VSS': 'Vesce sativa',
  'PHL': 'Phacélie',
  'PHA': 'Phacélie',

  // ── CULTURES DÉROBÉES / COUVERTS VÉGÉTAUX ────────────────────────────────
  // (champs culture_d1 et culture_d2 dans les données RPG V2)
  'DVN': 'Avoine (culture dérobée)',
  'DSG': 'Sorgho (culture dérobée)',
  'DSR': 'Sarrasin (culture dérobée)',
  'DMI': 'Moutarde (culture dérobée)',
  'DRA': 'Radis (culture dérobée)',
  'DNV': 'Navette (culture dérobée)',
  'DLN': 'Lin (culture dérobée)',
  'DCH': 'Chanvre (culture dérobée)',
  'DPS': 'Pois (culture dérobée)',
  'DFX': 'Féverole (culture dérobée)',
  'DGR': 'Graminée (culture dérobée)',
  'DLE': 'Légumineuse (culture dérobée)',
  'JNN': 'Jachère spontanée',
  'J5M': 'Jachère de 5 ans ou plus',
  'JP6': 'Jachère (6 ans ou plus)',
  'J6S': 'Jachère apicole / mellifère',
  'JAC': 'Jachère',
  'GEL': 'Gel (surfaces non productives)',

  // ── TERRES LABOURABLES DIVERSES ───────────────────────────────────────────
  'INN': 'Estives et landes',
  'SNE': 'Surface non exploitée',
  'SNA': 'Surface non agricole',
  'IGL': 'Surface en eau',

  // ── BETTERAVES / LÉGUMES INDUSTRIELS ──────────────────────────────────────
  'BTR': 'Betterave industrielle',
  'BTP': 'Betterave potagère',
  'PMT': 'Pommes de terre',
  'PMA': 'Pommes de terre amidon',

  // ── LÉGUMES ET HORTICULTURE ───────────────────────────────────────────────
  'LEG': 'Légumes ou fleurs',
  'LGU': 'Légumes ou fleurs',
  'CHX': 'Choux',
  'CLC': 'Cultures légumières de conservation',
  'MEL': 'Melons',
  'TOM': 'Tomates',
  'CNC': 'Concombres, cornichons',
  'ASS': 'Ail, oignon, échalote',
  'EPI': 'Épices, aromatiques',
  'FLA': 'Fleurs et plantes ornementales',
  'ARO': 'Plantes aromatiques et médicinales',
  'CAR': 'Carottes',
  'LTU': 'Laitue, salade',
  'HAR': 'Haricots',
  'POR': 'Poireaux',
  'CEL': 'Céleri',
  'EPG': 'Épinards',
  'PTT': 'Petits pois',

  // ── CULTURES INDUSTRIELLES ────────────────────────────────────────────────
  'CAN': 'Canne à sucre',
  'TAB': 'Tabac',
  'HOP': 'Houblon',
  'CHP': 'Chanvre',
  'LIT': 'Lin textile',
  'LIC': 'Lin textile',
  'MHE': 'Miscanthus (herbe énergétique)',
  'TCR': 'Taillis courte rotation',
  'AUT': 'Autres cultures industrielles',

  // ── VIGNES / VERGERS / CULTURES PÉRENNES ──────────────────────────────────
  'VRG': 'Vignes',
  'VIG': 'Vignes',
  'VER': 'Vergers',
  'ARB': 'Arboriculture',
  'OLI': 'Oliviers',
  'NOI': 'Noyers',
  'CAS': 'Châtaigniers',
  'POM': 'Pommiers',
  'POI_': 'Poiriers',
  'PEC': 'Pêchers, nectariniers',
  'CER_': 'Cerisiers',
  'PRU': 'Pruniers',
  'ABR': 'Abricotiers',
  'KIW': 'Kiwis',

  // ── BOIS / FORÊT ──────────────────────────────────────────────────────────
  'BOI': 'Bois et forêts',
  'FOR': 'Forêt',
  'TCF': 'Taillis de châtaignier',

  // ── DIVERS ────────────────────────────────────────────────────────────────
  'DIV': 'Divers',
  'MAR': 'Marais',
  'SEL': 'Sel',
  'AQU': 'Aquaculture',

  // ── CODES NUMÉRIQUES RPG V1 (code_cultu dans l'API v1, années 2010-2014) ────────────
  // Correspondent aux groupes de cultures de l'ancienne nomenclature ASP
  '1':  'Blé tendre',
  '01': 'Blé tendre',
  '2':  'Maïs grain et ensilage',
  '02': 'Maïs grain et ensilage',
  '3':  'Orge',
  '03': 'Orge',
  '4':  'Autres céréales',
  '04': 'Autres céréales',
  '5':  'Colza',
  '05': 'Colza',
  '6':  'Tournesol',
  '06': 'Tournesol',
  '7':  'Autres oléagineux',
  '07': 'Autres oléagineux',
  '8':  'Protéagineux',
  '08': 'Protéagineux',
  '9':  'Plantes à fibres',
  '09': 'Plantes à fibres',
  '10': 'Semences',
  '11': 'Gel (surfaces non productives)',
  '12': 'Légumes ou fleurs',
  '13': 'Prairies permanentes',
  '14': 'Estives et landes',
  '15': 'Surfaces toujours en herbe',
  '16': 'Canne à sucre',
  '17': 'Soja',
  '18': 'Prairies permanentes herbacées',
  '19': 'Surfaces en herbe temporaires',
  '20': 'Vergers',
  '21': 'Vignes',
  '22': 'Fruits à coque',
  '23': 'Oliviers',
  '24': 'Divers',
};

/**
 * Retourne le libellé complet d'un code culture RPG.
 * Retourne null si le code n'est pas connu (l'appelant gère le fallback).
 */
function getCultureLabel(code) {
  if (!code) return null;
  const trimmed = code.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  return RPG_CULTURE_CODES[upper] || null;
}

/**
 * Formate le texte nom_cultu (V1) en casse Titre lisible
 * ex: "PRAIRIES PERMANENTES" → "Prairies permanentes"
 */
function titleCase(str) {
  if (!str) return str;
  return str.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Formate les cultures d'une feature RPG (V1 ou V2) en libellés lisibles
 */
function formatCultures(feature) {
  const props = feature.properties || {};
  const results = [];

  // ── RPG V1 (2010-2014) : nom_cultu contient le texte, code_cultu est numérique ──
  if (props.nom_cultu && props.nom_cultu.trim()) {
    // Essayer d'abord le dictionnaire (pour un libellé normalisé)
    const fromCode = props.code_cultu ? getCultureLabel(props.code_cultu) : null;
    // Préférer le dictionnaire si trouvé, sinon formatter nom_cultu en casse lisible
    results.push(fromCode || titleCase(props.nom_cultu));
  }

  // ── RPG V2 (2015+) : culture_d1 / culture_d2 contiennent les codes lettre ─────────
  if (props.culture_d1 && props.culture_d1.trim()) {
    const c1 = getCultureLabel(props.culture_d1) || titleCase(props.culture_d1);
    if (c1 && !results.includes(c1)) results.push(c1);
  }
  if (props.culture_d2 && props.culture_d2.trim()) {
    const c2 = getCultureLabel(props.culture_d2) || titleCase(props.culture_d2);
    if (c2 && !results.includes(c2)) results.push(c2);
  }

  // ── Fallback : code_cultu si rien d'autre ──────────────────────────────────────────
  if (!results.length && props.code_cultu) {
    const fallback = getCultureLabel(props.code_cultu);
    results.push(fallback || props.code_cultu);
  }

  return results.length ? results.join(' ; ') : 'Non déclaré';
}

// ---------------------------------------------------------------------------
// Composants de carte
// ---------------------------------------------------------------------------
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) { onMapClick(e.latlng); }
  });
  return null;
}

function FitBounds({ geometry }) {
  const map = useMap();
  useEffect(() => {
    if (!geometry) return;
    try {
      const layer = L.geoJSON(geometry);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 18 });
      }
    } catch {}
  }, [geometry, map]);
  return null;
}

function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], Math.max(map.getZoom(), 15));
    }
  }, [position, map]);
  return null;
}

// Style du contour rouge de la parcelle RPG
const parcelStyle = {
  color: '#e53e3e',
  weight: 3,
  opacity: 1,
  fillColor: '#fc8181',
  fillOpacity: 0.15,
};

// Icône du marqueur de clic (petit point bleu)
const markerIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:#2563eb;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// ---------------------------------------------------------------------------
// Appel API RPG pour une année et un point géographique
// Retourne { features, geometry } ou null
// ---------------------------------------------------------------------------
async function fetchRpgForYear(lng, lat, year) {
  const geom = JSON.stringify({ type: 'Point', coordinates: [lng, lat] });
  const encodedGeom = encodeURIComponent(geom);
  const endpoint = year <= 2014 ? 'v1' : 'v2';
  const url = `https://apicarto.ign.fr/api/rpg/${endpoint}?annee=${year}&geom=${encodedGeom}&_limit=10`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.features || data.features.length === 0) return null;
  return data.features;
}

// ---------------------------------------------------------------------------
// Composant principal RpgTab
// ---------------------------------------------------------------------------
export default function RpgTab({ project, activeTab }) {
  const [markerPos, setMarkerPos] = useState(null);
  const [rpgHistory, setRpgHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parcelInfo, setParcelInfo] = useState(null);
  const [parcelGeometry, setParcelGeometry] = useState(null); // géométrie RPG pour le contour rouge
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef(null);
  const geoJsonKey = useRef(0); // force re-render GeoJSON

  // Années disponibles : 2024 → 2010
  const YEARS = Array.from({ length: 15 }, (_, i) => 2024 - i);

  // Initialise la position depuis le GPS du projet
  useEffect(() => {
    if (project?.gps && !markerPos) {
      const parts = project.gps.split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          setMarkerPos({ lat, lng });
        }
      }
    }
  }, [project?.gps]);

  const fetchHistory = useCallback(async (pos) => {
    if (!pos) return;

    // Annuler la requête précédente
    const currentAbort = { cancelled: false };
    if (abortRef.current) abortRef.current.cancelled = true;
    abortRef.current = currentAbort;

    setLoading(true);
    setHasSearched(true);
    setRpgHistory([]);
    setParcelInfo(null);
    setParcelGeometry(null);

    try {
      // ── Infos cadastrales (en parallèle) ──────────────────────────────────
      fetch(`https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [pos.lng, pos.lat] }))}&source_ign=PCI`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (currentAbort.cancelled) return;
          if (data?.features?.[0]) {
            const p = data.features[0].properties;
            setParcelInfo({
              code: p.id || p.code_parc || '',
              section: p.section || '',
              numero: p.numero || '',
              superficie: p.contenance || null,
              commune: p.nom_com || '',
            });
          }
        })
        .catch(() => {});

      // ── Historique RPG année par année ────────────────────────────────────
      const results = [];
      let firstGeometry = null; // géométrie de la première année avec déclaration

      for (const year of YEARS) {
        if (currentAbort.cancelled) break;

        try {
          const features = await fetchRpgForYear(pos.lng, pos.lat, year);
          if (currentAbort.cancelled) break;

          if (features) {
            const cultures = features.map(formatCultures).filter(Boolean);
            const uniqueCultures = [...new Set(cultures)];
            results.push({ year, cultures: uniqueCultures.join(' ; '), found: true });

            // Récupérer la géométrie de la parcelle RPG (depuis l'année la plus récente)
            if (!firstGeometry && features[0]?.geometry) {
              firstGeometry = features[0].geometry;
              geoJsonKey.current += 1;
              setParcelGeometry(firstGeometry);
            }
          } else {
            results.push({ year, cultures: null, found: false });
          }

          setRpgHistory([...results]);
        } catch {
          if (!currentAbort.cancelled) {
            results.push({ year, cultures: null, found: false });
            setRpgHistory([...results]);
          }
        }
      }
    } finally {
      if (!currentAbort.cancelled) setLoading(false);
    }
  }, []);

  const handleMapClick = useCallback((latlng) => {
    setMarkerPos(latlng);
    fetchHistory(latlng);
  }, [fetchHistory]);

  const handleRefresh = () => { if (markerPos) fetchHistory(markerPos); };

  const defaultCenter = markerPos
    ? [markerPos.lat, markerPos.lng]
    : [46.603354, 1.888334];

  const declaredCount = rpgHistory.filter(r => r.found).length;

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">

      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌾</span>
          <div>
            <h2 className="text-sm font-bold text-gray-800">Registre Parcellaire Graphique (RPG)</h2>
            <p className="text-xs text-gray-500">Cliquez sur une parcelle agricole pour voir son historique de cultures</p>
          </div>
        </div>
        {markerPos && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="ml-auto px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Chargement...
              </>
            ) : <>🔄 Actualiser</>}
          </button>
        )}
      </div>

      {/* ── Corps principal ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* Colonne gauche : Carte (2/3) */}
        <div className="lg:w-2/3 h-64 lg:h-full relative border-b lg:border-b-0 lg:border-r border-gray-200">
          {activeTab === 'rpg' && (
            <MapContainer
              center={defaultCenter}
              zoom={markerPos ? 15 : 6}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              {/* Fond satellite IGN Orthophotos */}
              <TileLayer
                url="https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"
                attribution="© IGN Orthophotos"
                maxZoom={20}
              />
              {/* Couche RPG superposée (transparence légère) */}
              <TileLayer
                url="https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=LANDUSE.AGRICULTURE.LATEST&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"
                attribution="© IGN RPG"
                opacity={0.45}
              />

              {/* Contour rouge de la parcelle RPG sélectionnée */}
              {parcelGeometry && (
                <GeoJSON
                  key={geoJsonKey.current}
                  data={parcelGeometry}
                  style={parcelStyle}
                />
              )}

              <ClickHandler onMapClick={handleMapClick} />

              {/* Recentrer sur la géométrie de la parcelle dès qu'elle arrive */}
              {parcelGeometry && <FitBounds geometry={parcelGeometry} />}

              {/* Recentrer si pas encore de géométrie */}
              {!parcelGeometry && markerPos && <RecenterMap position={markerPos} />}

              {/* Marqueur de clic */}
              {markerPos && (
                <Marker position={[markerPos.lat, markerPos.lng]} icon={markerIcon} />
              )}
            </MapContainer>
          )}

          {/* Instruction overlay (avant premier clic) */}
          {!hasSearched && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-blue-200 text-center max-w-[220px]">
                <div className="text-2xl mb-1">👆</div>
                <p className="text-xs font-semibold text-blue-700">Cliquez sur la carte</p>
                <p className="text-xs text-gray-600 mt-0.5">pour afficher l'historique RPG de la parcelle</p>
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite : Résultats (1/3) */}
        <div className="lg:w-1/3 flex flex-col overflow-hidden">
          {!hasSearched ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center text-gray-400">
                <div className="text-5xl mb-3">🌱</div>
                <p className="text-sm font-medium">Aucune parcelle sélectionnée</p>
                <p className="text-xs mt-1">Cliquez sur la carte pour démarrer</p>
              </div>
            </div>
          ) : (
            <>
              {/* Infos parcelle cadastrale */}
              {parcelInfo && (
                <div className="shrink-0 bg-blue-50 border-b border-blue-100 px-3 py-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-blue-700">📍 Parcelle cadastrale :</span>
                    {parcelInfo.section && parcelInfo.numero && (
                      <span className="text-xs bg-blue-600 text-white rounded px-2 py-0.5 font-mono">
                        Section {parcelInfo.section} N°{parcelInfo.numero}
                      </span>
                    )}
                    {parcelInfo.commune && (
                      <span className="text-xs text-blue-600 font-medium">{parcelInfo.commune}</span>
                    )}
                    {parcelInfo.superficie && (
                      <span className="text-xs text-gray-600">{(parcelInfo.superficie / 10000).toFixed(2)} ha</span>
                    )}
                  </div>
                  {parcelInfo.code && (
                    <div className="text-[10px] text-gray-500 mt-0.5 font-mono">{parcelInfo.code}</div>
                  )}
                </div>
              )}

              {/* Barre de stats */}
              {rpgHistory.length > 0 && (
                <div className="shrink-0 bg-green-50 border-b border-green-100 px-3 py-1.5 flex items-center gap-2">
                  <span className="text-xs text-gray-600">
                    <span className="font-bold text-green-700">{declaredCount}</span> an{declaredCount > 1 ? 's' : ''} avec déclaration RPG
                    {loading && <span className="text-gray-400 ml-1">(chargement…)</span>}
                  </span>
                  {!loading && rpgHistory.length === YEARS.length && (
                    <span className="text-xs text-gray-400 ml-auto">/ {YEARS.length} ans vérifiés</span>
                  )}
                </div>
              )}

              {/* Liste des années */}
              <div className="flex-1 overflow-y-auto">
                {loading && rpgHistory.length === 0 && (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <svg className="animate-spin w-8 h-8 text-blue-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-xs text-gray-500">Interrogation de l'API RPG…</p>
                    </div>
                  </div>
                )}

                {rpgHistory.length > 0 && (
                  <div className="divide-y divide-gray-100">
                    {rpgHistory.map(({ year, cultures, found }) => (
                      <div
                        key={year}
                        className={`flex items-start gap-2 px-3 py-2 transition-colors ${
                          found ? 'bg-white hover:bg-green-50' : 'bg-gray-50 opacity-60'
                        }`}
                      >
                        {/* Année */}
                        <div className={`shrink-0 text-xs font-bold w-9 pt-0.5 ${found ? 'text-gray-800' : 'text-gray-400'}`}>
                          {year}
                        </div>

                        {/* Pastille */}
                        <div className="shrink-0 mt-1">
                          {found
                            ? <span className="block w-3.5 h-3.5 rounded-full bg-green-500" />
                            : <span className="block w-3.5 h-3.5 rounded-full bg-gray-300" />}
                        </div>

                        {/* Libellés cultures */}
                        <div className="flex-1 min-w-0">
                          {found ? (
                            <div className="flex flex-wrap gap-1">
                              {cultures.split(' ; ').map((culture, i) => (
                                <span
                                  key={i}
                                  className="inline-block text-[11px] bg-green-100 text-green-800 rounded px-1.5 py-0.5 font-medium leading-tight"
                                >
                                  {culture}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400 italic">Pas de déclaration RPG</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Indicateur de chargement des années restantes */}
                    {loading && rpgHistory.length < YEARS.length && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50">
                        <svg className="animate-spin w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-xs text-blue-600">
                          Vérification {YEARS[rpgHistory.length] || ''}…
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer source */}
              {!loading && rpgHistory.length > 0 && (
                <div className="shrink-0 px-3 py-1.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400">Source : IGN APICarto / ASP</p>
                  <a
                    href="https://data.gouv.fr/datasets/rpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-500 hover:text-blue-700 underline"
                  >
                    data.gouv.fr
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
