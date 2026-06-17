import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ---------------------------------------------------------------------------
// Dictionnaire des codes de cultures RPG → libellés français
// Source : ASP / Géoportail
// ---------------------------------------------------------------------------
const RPG_CULTURE_CODES = {
  // Grandes cultures
  'BLE': 'Blé tendre',
  'BTH': 'Blé tendre',
  'BDH': 'Blé dur',
  'ORH': 'Orge',
  'MID': 'Maïs grain et ensilage',
  'MIS': 'Maïs semence',
  'MIG': 'Maïs grain',
  'MIE': 'Maïs ensilage',
  'TRN': 'Triticale',
  'SOR': 'Sorgho',
  'SEI': 'Seigle',
  'AVO': 'Avoine',
  'FXL': 'Féverole',
  'POI': 'Pois protéagineux',
  'LUZ': 'Luzerne',
  'RAY': 'Ray-grass',
  'ESC': 'Escourgeon',
  'EPE': 'Epeautre',
  // Oléagineux
  'COL': 'Colza',
  'TOU': 'Tournesol',
  'LIN': 'Lin oléagineux',
  'SOJ': 'Soja',
  // Prairies
  'PPH': 'Prairies permanentes',
  'PPE': 'Prairies permanentes',
  'PTH': 'Prairies temporaires',
  'PTE': 'Prairies temporaires',
  'INN': 'Estives et landes',
  'APH': 'Autres prairies',
  // Légumes / fruits
  'LEG': 'Légumes ou fleurs',
  'LGU': 'Légumes ou fleurs',
  'PMT': 'Pommes de terre',
  'BTR': 'Betterave industrielle',
  'CAN': 'Canne à sucre',
  'TAB': 'Tabac',
  'HOP': 'Houblon',
  // Vignes / vergers
  'VRG': 'Vignes',
  'VIG': 'Vignes',
  'VER': 'Vergers',
  'ARB': 'Arboriculture',
  // Divers
  'DIV': 'Divers',
  'GEL': 'Gel (surfaces non productives)',
  'JAC': 'Jachère',
  'MHE': 'Miscanthus ou herbe énergétique',
  'AUT': 'Autres cultures industrielles',
  'CHP': 'Chanvre',
  'LIC': 'Lin textile',
  'ANC': 'Autres céréales',
  'CER': 'Autres céréales',
  'PRL': 'Prairie permanente à flore variée',
  'PRG': 'Prairie permanente riche en espèces',
  'PRE': 'Prairie permanente',
  'STH': 'Surfaces toujours en herbe',
  'FOU': 'Fourrage',
  'PTV': 'Pâturage temporaire des zones humides',
  'SNE': 'Surface non exploitée',
  'SNA': 'Surface non agricole',
  // Bois / forêt
  'BOI': 'Bois et forêts',
  'TCR': 'Taillis courte rotation',
  // Autres
  'ASS': 'Ail, oignon, échalote',
  'EPI': 'Épices, aromatiques',
  'FLA': 'Fleurs et plantes ornementales',
  'MAR': 'Marais',
  'SEL': 'Sel',
};

/**
 * Retourne le libellé d'un code culture RPG
 */
function getCultureLabel(code) {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  return RPG_CULTURE_CODES[upper] || code;
}

/**
 * Formate les cultures d'une feature RPG (V1 ou V2)
 */
function formatCultures(feature) {
  const props = feature.properties || {};
  const results = [];
  
  // V1 (2010-2014): nom_cultu disponible directement
  if (props.nom_cultu) {
    results.push(props.nom_cultu);
  }
  
  // V1 via code
  if (!results.length && props.code_cultu) {
    const label = getCultureLabel(props.code_cultu);
    if (label) results.push(label);
  }
  
  // V2 (2015+): culture_d1 / culture_d2
  if (props.culture_d1 && props.culture_d1.trim()) {
    const c1 = getCultureLabel(props.culture_d1) || props.culture_d1;
    if (!results.includes(c1)) results.push(c1);
  }
  if (props.culture_d2 && props.culture_d2.trim()) {
    const c2 = getCultureLabel(props.culture_d2) || props.culture_d2;
    if (!results.includes(c2)) results.push(c2);
  }
  
  // Fallback sur code_cultu s'il n'y a rien d'autre
  if (!results.length && props.code_cultu) {
    results.push(getCultureLabel(props.code_cultu) || props.code_cultu);
  }
  
  return results.length ? results.join(' ; ') : 'Non déclaré';
}

// ---------------------------------------------------------------------------
// Composant de carte cliquable
// ---------------------------------------------------------------------------
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
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

// Icône de marqueur
const markerIcon = L.divIcon({
  className: '',
  html: `<div style="width:24px;height:24px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// ---------------------------------------------------------------------------
// Appel API RPG pour une année et un point géographique
// ---------------------------------------------------------------------------
async function fetchRpgForYear(lng, lat, year) {
  const geom = JSON.stringify({ type: 'Point', coordinates: [lng, lat] });
  const encodedGeom = encodeURIComponent(geom);
  
  if (year <= 2014) {
    // API RPG V1 (2010-2014)
    const url = `https://apicarto.ign.fr/api/rpg/v1?annee=${year}&geom=${encodedGeom}&_limit=10`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.features && data.features.length > 0 ? data.features : null;
  } else {
    // API RPG V2 (2015-2024)
    const url = `https://apicarto.ign.fr/api/rpg/v2?annee=${year}&geom=${encodedGeom}&_limit=10`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.features && data.features.length > 0 ? data.features : null;
  }
}

// ---------------------------------------------------------------------------
// Composant principal RpgTab
// ---------------------------------------------------------------------------
export default function RpgTab({ project, activeTab }) {
  const [markerPos, setMarkerPos] = useState(null);
  const [rpgHistory, setRpgHistory] = useState([]); // [{ year, cultures, found }]
  const [loading, setLoading] = useState(false);
  const [parcelInfo, setParcelInfo] = useState(null); // infos cadastrales de la parcelle
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef(null);

  // Années disponibles : 2024 → 2010
  const YEARS = Array.from({ length: 15 }, (_, i) => 2024 - i); // 2024..2010

  // Initialise la position depuis le projet
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

  // Fetch RPG history when markerPos changes (with debounce)
  const fetchHistory = useCallback(async (pos) => {
    if (!pos) return;
    
    // Abort previous requests
    if (abortRef.current) {
      abortRef.current = true;
    }
    const currentAbort = { cancelled: false };
    abortRef.current = currentAbort;
    
    setLoading(true);
    setHasSearched(true);
    setRpgHistory([]);
    setParcelInfo(null);
    
    try {
      // Récupérer infos cadastrales en parallèle
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
      
      // Fetcher les années séquentiellement pour éviter de surcharger l'API
      const results = [];
      for (const year of YEARS) {
        if (currentAbort.cancelled) break;
        
        try {
          const features = await fetchRpgForYear(pos.lng, pos.lat, year);
          if (currentAbort.cancelled) break;
          
          if (features) {
            const cultures = features.map(formatCultures).filter(Boolean);
            const uniqueCultures = [...new Set(cultures)];
            results.push({ year, cultures: uniqueCultures.join(' ; '), found: true });
          } else {
            results.push({ year, cultures: null, found: false });
          }
          
          // Mettre à jour progressivement
          setRpgHistory([...results]);
        } catch {
          if (!currentAbort.cancelled) {
            results.push({ year, cultures: null, found: false });
            setRpgHistory([...results]);
          }
        }
      }
    } finally {
      if (!currentAbort.cancelled) {
        setLoading(false);
      }
    }
  }, []);

  const handleMapClick = useCallback((latlng) => {
    setMarkerPos(latlng);
    fetchHistory(latlng);
  }, [fetchHistory]);

  const handleRefresh = () => {
    if (markerPos) fetchHistory(markerPos);
  };

  // GPS par défaut si pas de projet
  const defaultCenter = markerPos
    ? [markerPos.lat, markerPos.lng]
    : [46.603354, 1.888334];

  // Nombre d'années avec déclaration
  const declaredCount = rpgHistory.filter(r => r.found).length;

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* En-tête */}
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
            ) : (
              <>🔄 Actualiser</>
            )}
          </button>
        )}
      </div>

      {/* Corps principal : carte + résultats */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Colonne gauche : Carte */}
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
                attribution='© IGN Orthophotos'
                maxZoom={20}
              />
              {/* Couche RPG pour visualisation */}
              <TileLayer
                url="https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=LANDUSE.AGRICULTURE.LATEST&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"
                attribution='© IGN RPG'
                opacity={0.5}
              />
              <ClickHandler onMapClick={handleMapClick} />
              {markerPos && (
                <>
                  <RecenterMap position={markerPos} />
                  <Marker position={[markerPos.lat, markerPos.lng]} icon={markerIcon} />
                </>
              )}
            </MapContainer>
          )}
          {/* Instruction overlay */}
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

        {/* Colonne droite : Résultats */}
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
                <div className="shrink-0 bg-blue-50 border-b border-blue-100 px-4 py-2">
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

              {/* Statistiques */}
              {rpgHistory.length > 0 && (
                <div className="shrink-0 bg-green-50 border-b border-green-100 px-4 py-2 flex items-center gap-4">
                  <span className="text-xs text-gray-600">
                    <span className="font-bold text-green-700">{declaredCount}</span> année{declaredCount > 1 ? 's' : ''} avec déclaration RPG
                    {loading && <span className="text-gray-400 ml-1">(chargement en cours…)</span>}
                  </span>
                  {!loading && rpgHistory.length === YEARS.length && (
                    <span className="text-xs text-gray-400">sur {YEARS.length} années vérifiées (2010-2024)</span>
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
                      <p className="text-xs text-gray-500">Interrogation de l'API RPG...</p>
                    </div>
                  </div>
                )}

                {rpgHistory.length > 0 && (
                  <div className="divide-y divide-gray-100">
                    {rpgHistory.map(({ year, cultures, found }) => (
                      <div
                        key={year}
                        className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${
                          found
                            ? 'bg-white hover:bg-green-50'
                            : 'bg-gray-50 opacity-60'
                        }`}
                      >
                        {/* Année */}
                        <div className={`shrink-0 text-xs font-bold w-10 pt-0.5 ${found ? 'text-gray-800' : 'text-gray-400'}`}>
                          {year}
                        </div>
                        
                        {/* Indicateur */}
                        <div className="shrink-0 mt-0.5">
                          {found ? (
                            <span className="inline-block w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[9px] font-bold">✓</span>
                          ) : (
                            <span className="inline-block w-4 h-4 rounded-full bg-gray-300"></span>
                          )}
                        </div>
                        
                        {/* Cultures */}
                        <div className="flex-1 min-w-0">
                          {found ? (
                            <div className="flex flex-wrap gap-1">
                              {cultures.split(' ; ').map((culture, i) => (
                                <span
                                  key={i}
                                  className="inline-block text-xs bg-green-100 text-green-800 rounded px-1.5 py-0.5 font-medium"
                                >
                                  🌾 {culture}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Pas de déclaration RPG</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Indicateur de chargement des années restantes */}
                    {loading && rpgHistory.length < YEARS.length && (
                      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50">
                        <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-xs text-blue-600">
                          Vérification de l'année {YEARS[rpgHistory.length] || ''}...
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer avec source */}
              {!loading && rpgHistory.length > 0 && (
                <div className="shrink-0 px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400">
                    Source : IGN APICarto / Registre Parcellaire Graphique (ASP)
                  </p>
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
