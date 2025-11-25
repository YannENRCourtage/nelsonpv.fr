import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Building2, Layers as LayersIcon, MapPin as MapIcon, Satellite, Mountain, Zap, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.js';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
// Base layers with multiple satellite and map providers
const baseLayers = {
    // OpenStreetMap variants
    osm: {
        name: 'OpenStreetMap',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    },
    osm_hot: {
        name: 'OpenStreetMap HOT',
        url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team',
        maxZoom: 19,
    },
    // Google variants
    google_satellite: {
        name: 'Google Satellite',
        url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        attribution: 'Google',
        maxZoom: 22,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    },
    google_hybrid: {
        name: 'Google Hybrid (Satellite + Labels)',
        url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        attribution: 'Google',
        maxZoom: 22,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    },
    google_terrain: {
        name: 'Google Terrain',
        url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
        attribution: 'Google',
        maxZoom: 22,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    },
    google_streets: {
        name: 'Google Streets',
        url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        attribution: 'Google',
        maxZoom: 22,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    },
    // Esri variants
    esri_satellite: {
        name: 'Esri World Imagery',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
    },
    esri_streets: {
        name: 'Esri World Street Map',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
    },
    esri_topo: {
        name: 'Esri World Topographic',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
    },
    // IGN France (Géoportail)
    ign: {
        name: 'IGN-F/Géoportail - Plan',
        url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
        attribution: 'IGN-F/Géoportail',
        maxZoom: 19,
    },
    ign_ortho: {
        name: 'IGN-F/Géoportail - Satellite',
        url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
        attribution: 'IGN-F/Géoportail',
        maxZoom: 21,
    },
    ign_scan25: {
        name: 'IGN-F - Cartes topographiques',
        url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
        attribution: 'IGN-F/Géoportail',
        maxZoom: 18,
    },
    // CartoDB variants
    cartodb_positron: {
        name: 'CartoDB Positron (Light)',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
        subdomains: 'abcd',
    },
    cartodb_dark: {
        name: 'CartoDB Dark Matter',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
        subdomains: 'abcd',
    },
    // OpenTopoMap
    opentopo: {
        name: 'OpenTopoMap',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
        maxZoom: 17,
    },
};
// Overlay layers with comprehensive French data
const overlayCategories = {
    'Altimétrie': {
        layers: {
            'Courbes de niveau': {
                url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ELEVATION.LEVEL&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
                attribution: 'IGN-F/Géoportail',
                type: 'tile',
            },
            'Relief ombré': {
                url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ELEVATION.SLOPES&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
                attribution: 'IGN-F/Géoportail',
                type: 'tile',
            },
        },
    },
    'Cadastre et parcelles': {
        layers: {
            'Parcelles cadastrales': {
                url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
                attribution: 'IGN-F/Géoportail, Cadastre',
                type: 'tile',
            },
            'Bâtiments': {
                url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=BUILDINGS.BUILDINGS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
                attribution: 'IGN-F/Géoportail',
                type: 'tile',
            },
        },
    },
    'Réseau électrique ENEDIS': {
        layers: {
            'Postes HTA/BT': {
                url: '/postes-de-distribution-publique-postes-htabt.geojson',
                attribution: 'ENEDIS',
                type: 'geojson',
            },
        },
    },
    'Hydrographie': {
        layers: {
            'Cours d\'eau': {
                url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=HYDROGRAPHY.HYDROGRAPHY&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
                attribution: 'IGN-F/Géoportail',
                type: 'tile',
            },
        },
    },
    'Transport': {
        layers: {
            'Routes': {
                url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=TRANSPORTNETWORKS.ROADS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
                attribution: 'IGN-F/Géoportail',
                type: 'tile',
            },
            'Voies ferrées': {
                url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=TRANSPORTNETWORKS.RAILWAYS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
                attribution: 'IGN-F/Géoportail',
                type: 'tile',
            },
        },
    },
    'Limites administratives': {
        layers: {
            'Communes': {
                url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ADMINISTRATIVEUNITS.BOUNDARIES&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
                attribution: 'IGN-F/Géoportail',
                type: 'tile',
            },
        },
    },
    'Urbanisme': {
        layers: {
            'PLU/PLUi': {
                url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=LANDUSE.AGRICULTURE2019&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
                attribution: 'IGN-F/Géoportail',
                type: 'tile',
            },
        },
    },
    'Risques': {
        layers: {
            'Zones inondables': {
                url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
                attribution: 'IGN-F/Géoportail',
                type: 'tile',
            },
        },
    },
};
const MapLayersPanel = ({ map }) => {
    const [activeBaseLayer, setActiveBaseLayer] = useState('google_satellite');
    const [activeOverlays, setActiveOverlays] = useState({});
    const [leafletBaseLayers, setLeafletBaseLayers] = useState({});
    const [leafletOverlayLayers, setLeafletOverlayLayers] = useState({});
    const [geoJsonLayers, setGeoJsonLayers] = useState({});
    const [loadingLayers, setLoadingLayers] = useState({});
    // Initialize base layers
    useEffect(() => {
        if (!map) return;
        const newBaseLayers = {};
        Object.entries(baseLayers).forEach(([key, layerConfig]) => {
            let layer;
            if (layerConfig.subdomains) {
                layer = L.tileLayer(layerConfig.url, {
                    attribution: layerConfig.attribution,
                    maxZoom: layerConfig.maxZoom,
                    subdomains: layerConfig.subdomains,
                });
            } else {
                layer = L.tileLayer(layerConfig.url, {
                    attribution: layerConfig.attribution,
                    maxZoom: layerConfig.maxZoom,
                });
            }
            newBaseLayers[key] = layer;
        });
        setLeafletBaseLayers(newBaseLayers);
        // Add initial base layer to map
        if (newBaseLayers[activeBaseLayer]) {
            newBaseLayers[activeBaseLayer].addTo(map);
        }
    }, [map]);
    // Initialize overlay layers
    useEffect(() => {
        if (!map) return;
        const newOverlayLayers = {};
        const newGeoJsonLayers = {};
        Object.entries(overlayCategories).forEach(([categoryName, category]) => {
            Object.entries(category.layers).forEach(([layerName, layerConfig]) => {
                if (layerConfig.type === 'geojson') {
                    newGeoJsonLayers[layerName] = null;
                } else {
                    const tileLayer = L.tileLayer(layerConfig.url, {
                        attribution: layerConfig.attribution,
                        maxZoom: 20,
                        transparent: true,
                    });
                    newOverlayLayers[layerName] = tileLayer;
                }
            });
        });
        setLeafletOverlayLayers(newOverlayLayers);
        setGeoJsonLayers(newGeoJsonLayers);
    }, [map]);
    // Handle base layer changes
    useEffect(() => {
        if (!map || !leafletBaseLayers[activeBaseLayer]) return;
        // Remove current base layer
        Object.values(leafletBaseLayers).forEach(layer => {
            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        });
        // Add new active base layer
        leafletBaseLayers[activeBaseLayer].addTo(map);
    }, [activeBaseLayer, map, leafletBaseLayers]);
    const handleBaseLayerChange = (layerKey) => {
        setActiveBaseLayer(layerKey);
    };
    const handleOverlayToggle = async (layerName, checked) => {
        setActiveOverlays(prev => {
            const newActive = { ...prev, [layerName]: checked };
            if (map) {
                let layerConfig = null;
                for (const category of Object.values(overlayCategories)) {
                    if (category.layers[layerName]) {
                        layerConfig = category.layers[layerName];
                        break;
                    }
                }
                if (layerConfig) {
                    if (layerConfig.type === 'geojson') {
                        if (checked) {
                            if (!geoJsonLayers[layerName]) {
                                setLoadingLayers(prev => ({ ...prev, [layerName]: true }));
                                fetch(layerConfig.url)
                                    .then(response => response.json())
                                    .then(data => {
                                        const markerClusterGroup = L.markerClusterGroup({
                                            chunkedLoading: true,
                                            chunkInterval: 200,
                                            chunkDelay: 50,
                                            maxClusterRadius: 50,
                                            spiderfyOnMaxZoom: true,
                                            showCoverageOnHover: false,
                                            zoomToBoundsOnClick: true,
                                            iconCreateFunction: function (cluster) {
                                                const count = cluster.getChildCount();
                                                let size = 'small';
                                                if (count > 100) size = 'large';
                                                else if (count > 10) size = 'medium';
                                                return L.divIcon({
                                                    html: `<div style="background-color: ${size === 'small' ? 'rgba(255,215,0,0.7)' : size === 'medium' ? 'rgba(255,165,0,0.7)' : 'rgba(255,107,0,0.8)'}; border: 3px solid ${size === 'small' ? 'rgba(255,165,0,0.9)' : size === 'medium' ? 'rgba(255,107,0,0.9)' : 'rgba(204,85,0,1)'}; width: ${size === 'small' ? '30px' : size === 'medium' ? '40px' : '50px'}; height: ${size === 'small' ? '30px' : size === 'medium' ? '40px' : '50px'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: ${size === 'small' ? '12px' : size === 'medium' ? '14px' : '16px'};"><span>${count}</span></div>`,
                                                    className: '',
                                                    iconSize: L.point(40, 40)
                                                });
                                            }
                                        });
                                        const geoJsonLayer = L.geoJSON(data, {
                                            pointToLayer: (feature, latlng) => {
                                                const icon = L.divIcon({
                                                    className: '',
                                                    html: '<div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); width: 14px; height: 14px; border-radius: 50%; border: 2px solid #FF6B00; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                                                    iconSize: [14, 14],
                                                    iconAnchor: [7, 7],
                                                });
                                                return L.marker(latlng, { icon });
                                            },
                                            onEachFeature: (feature, layer) => {
                                                if (feature.properties) {
                                                    const props = feature.properties;
                                                    let popupContent = '<div style="font-family: sans-serif;">';
                                                    popupContent += '<h4 style="margin: 0 0 8px 0; color: #FF6B00; font-size: 16px; font-weight: bold;">⚡ Poste ENEDIS</h4>';
                                                    if (props.nom_poste) popupContent += `<p style="margin: 4px 0;"><strong>Nom:</strong> ${props.nom_poste}</p>`;
                                                    if (props.type_poste) popupContent += `<p style="margin: 4px 0;"><strong>Type:</strong> ${props.type_poste}</p>`;
                                                    if (props.puissance) popupContent += `<p style="margin: 4px 0;"><strong>Puissance:</strong> ${props.puissance}</p>`;
                                                    if (props.code_commune) popupContent += `<p style="margin: 4px 0;"><strong>Commune:</strong> ${props.code_commune}</p>`;
                                                    Object.keys(props).forEach(key => {
                                                        if (!['nom_poste', 'type_poste', 'puissance', 'code_commune'].includes(key) && props[key]) {
                                                            const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                                            popupContent += `<p style="margin: 4px 0;"><strong>${formattedKey}:</strong> ${props[key]}</p>`;
                                                        }
                                                    });
                                                    popupContent += '</div>';
                                                    layer.bindPopup(popupContent, {
                                                        maxWidth: 300
                                                    });
                                                }
                                            }
                                        });
                                        markerClusterGroup.addLayer(geoJsonLayer);
                                        markerClusterGroup.addTo(map);
                                        setGeoJsonLayers(prev => ({ ...prev, [layerName]: markerClusterGroup }));
                                        setLoadingLayers(prev => ({ ...prev, [layerName]: false }));
                                    })
                                    .catch(error => {
                                        console.error('Erreur lors du chargement du GeoJSON:', error);
                                        alert('Impossible de charger les postes ENEDIS. Assurez-vous que le fichier postes-de-distribution-publique-postes-htabt.geojson est dans le dossier /public/');
                                        setLoadingLayers(prev => ({ ...prev, [layerName]: false }));
                                    });
                            } else {
                                geoJsonLayers[layerName].addTo(map);
                            }
                        } else {
                            if (geoJsonLayers[layerName]) {
                                map.removeLayer(geoJsonLayers[layerName]);
                            }
                        }
                    } else {
                        if (checked && leafletOverlayLayers[layerName]) {
                            leafletOverlayLayers[layerName].addTo(map);
                        } else if (!checked && leafletOverlayLayers[layerName]) {
                            map.removeLayer(leafletOverlayLayers[layerName]);
                        }
                    }
                }
            }
            return newActive;
        });
    };
    return (
        <Card className="absolute bottom-4 right-4 z-[1000] w-80 max-h-[80vh] overflow-y-auto rounded-2xl shadow-lg bg-white/95 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                <CardTitle className="text-lg font-semibold">Fonds de carte & Calques</CardTitle>
                <LayersIcon size={20} className="text-gray-600" />
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
                        <Satellite size={16} />
                        Fonds de carte
                    </h3>
                    <div className="space-y-2 ml-1">
                        {Object.entries(baseLayers).map(([key, config]) => (
                            <div key={key} className="flex items-center space-x-2">
                                <Switch
                                    id={`base-${key}`}
                                    checked={activeBaseLayer === key}
                                    onCheckedChange={() => handleBaseLayerChange(key)}
                                />
                                <Label htmlFor={`base-${key}`} className="text-sm cursor-pointer">
                                    {config.name}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
                {Object.entries(overlayCategories).map(([categoryName, category]) => (
                    <div key={categoryName}>
                        <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
                            {categoryName === 'Altimétrie' && <Mountain size={16} />}
                            {categoryName === 'Réseau électrique ENEDIS' && <Zap size={16} />}
                            {categoryName !== 'Altimétrie' && categoryName !== 'Réseau électrique ENEDIS' && <LayersIcon size={16} />}
                            {categoryName}
                        </h3>
                        <div className="space-y-2 ml-1">
                            {Object.entries(category.layers).map(([layerName, layerConfig]) => (
                                <div key={layerName} className="flex items-center space-x-2">
                                    <Switch
                                        id={`overlay-${layerName.replace(/\s/g, '-')}`}
                                        checked={activeOverlays[layerName] || false}
                                        onCheckedChange={(checked) => handleOverlayToggle(layerName, checked)}
                                        disabled={loadingLayers[layerName]}
                                    />
                                    <Label
                                        htmlFor={`overlay-${layerName.replace(/\s/g, '-')}`}
                                        className="text-sm cursor-pointer flex items-center gap-1"
                                    >
                                        {layerName}
                                        {loadingLayers[layerName] && <Loader2 size={12} className="animate-spin text-blue-500" />}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <div className="text-xs text-gray-500 mt-4 border-t pt-4">
                    <p className="font-semibold mb-1">Attributions:</p>
                    <p className="leading-relaxed">
                        {baseLayers[activeBaseLayer]?.attribution}
                        {Object.entries(activeOverlays).map(([layerName, isActive]) => {
                            if (isActive) {
                                for (const category of Object.values(overlayCategories)) {
                                    if (category.layers[layerName]) {
                                        return ` • ${category.layers[layerName].attribution}`;
                                    }
                                }
                            }
                            return '';
                        })}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};
export default MapLayersPanel;