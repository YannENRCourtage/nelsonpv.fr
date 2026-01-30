import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Loader2, FileText, MapPin, Download, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import L from 'leaflet';

// Fix Leaflet marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map clicks
function MapEvents({ onMapClick }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng);
        },
    });
    return null;
}

// Component to fly to location
function MapFlyTo({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 16);
        }
    }, [center, map]);
    return null;
}

export default function Urbanisme() {
    const [center, setCenter] = useState([46.603354, 1.888334]); // France default
    const [markerPosition, setMarkerPosition] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Initial geolocation
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                setCenter([position.coords.latitude, position.coords.longitude]);
            });
        }
    }, []);

    const fetchDocuments = async (lat, lng) => {
        setLoading(true);
        setError(null);
        setDocuments([]);

        try {
            const response = await fetch(`https://www.geoportail-urbanisme.gouv.fr/api/v1/document?lat=${lat}&lon=${lng}`);

            if (!response.ok) {
                if (response.status === 404) {
                    setError("Aucun document d'urbanisme trouvé pour cette zone.");
                } else {
                    throw new Error(`Erreur API: ${response.status}`);
                }
                return;
            }

            const data = await response.json();
            setDocuments(Array.isArray(data) ? data : [data]);

        } catch (err) {
            console.error("Error fetching urbanisme documents:", err);
            setError("Impossible de récupérer les documents d'urbanisme. Veuillez réessayer.");
        } finally {
            setLoading(false);
        }
    };

    const handleMapClick = (latlng) => {
        setMarkerPosition(latlng);
        fetchDocuments(latlng.lat, latlng.lng);
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length > 3) {
            setIsSearching(true);
            try {
                const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
                const data = await response.json();
                setSearchResults(data.features || []);
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setIsSearching(false);
            }
        } else {
            setSearchResults([]);
        }
    };

    const selectAddress = (feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const newPos = { lat, lng };

        setCenter([lat, lng]);
        setMarkerPosition(newPos);
        setSearchQuery(feature.properties.label);
        setSearchResults([]);

        // Trigger fetching documents for the selected address
        fetchDocuments(lat, lng);
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full flex-col md:flex-row bg-slate-50">
            {/* Left Side - Map */}
            <div className="relative w-full md:w-[70%] h-[50vh] md:h-full border-r border-slate-200 shadow-inner">
                {/* Search Overlay */}
                <div className="absolute top-4 left-4 z-[1000] w-full max-w-sm">
                    <div className="relative bg-white rounded-md shadow-lg">
                        <div className="flex items-center px-3 py-2 border-b">
                            <Search className="w-5 h-5 text-slate-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Rechercher une adresse..."
                                className="w-full text-sm outline-none bg-transparent"
                                value={searchQuery}
                                onChange={handleSearch}
                            />
                            {isSearching && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                        </div>

                        {searchResults.length > 0 && (
                            <ul className="max-h-60 overflow-auto py-1">
                                {searchResults.map((result) => (
                                    <li
                                        key={result.properties.id}
                                        className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-sm flex items-start gap-2"
                                        onClick={() => selectAddress(result)}
                                    >
                                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                        <span>{result.properties.label}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <MapContainer center={center} zoom={6} scrollWheelZoom={true} className="h-full w-full">
                    {/* View Satellites via Geoportail or similar could be added here, sticking to OSM for base */}
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapEvents onMapClick={handleMapClick} />
                    <MapFlyTo center={center} />
                    {markerPosition && <Marker position={markerPosition} />}
                </MapContainer>
            </div>

            {/* Right Side - Analysis Panel */}
            <div className="w-full md:w-[30%] h-[50vh] md:h-full flex flex-col bg-white">
                <div className="p-4 border-b bg-white">
                    <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <FileText className="w-6 h-6 text-blue-600" />
                        Urbanisme
                    </h1>
                    <p className="text-sm text-slate-500">Analyse automatique par parcelle</p>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {!markerPosition ? (
                        <div className="flex flex-col items-center justify-center h-40 text-center text-slate-500 mt-10">
                            <MapPin className="w-12 h-12 mb-3 opacity-20" />
                            <p>Cliquez sur la carte ou recherchez une adresse pour analyser une zone.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <Card className="bg-slate-50 border-slate-200">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Position sélectionnée</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-400">LATITUDE</span>
                                            <span className="font-mono font-medium">{markerPosition.lat.toFixed(6)}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-xs text-slate-400">LONGITUDE</span>
                                            <span className="font-mono font-medium">{markerPosition.lng.toFixed(6)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                    <p className="text-sm text-slate-500">Recherche des documents en cours...</p>
                                </div>
                            ) : error ? (
                                <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 flex gap-2 items-start">
                                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                    <div>
                                        <h5 className="font-medium mb-1">Résultat</h5>
                                        <p className="text-sm">{error}</p>
                                    </div>
                                </div>
                            ) : documents.length > 0 ? (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                        Documents trouvés
                                        <Badge variant="secondary" className="rounded-full">{documents.length}</Badge>
                                    </h3>

                                    {documents.map((doc, idx) => (
                                        <Card key={idx} className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-slate-900">{doc.type || "Document d'urbanisme"}</h4>
                                                        <p className="text-xs text-slate-500 uppercase font-semibold mt-1">
                                                            {doc.documentState || "État inconnu"}
                                                        </p>
                                                    </div>
                                                    {doc.commune && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {doc.commune}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 gap-2 pt-2">
                                                    {doc.archiveUrl && (
                                                        <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs" asChild>
                                                            <a href={doc.archiveUrl} target="_blank" rel="noopener noreferrer">
                                                                <Download className="w-3 h-3 mr-2" />
                                                                Télécharger le règlement
                                                            </a>
                                                        </Button>
                                                    )}

                                                    <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50" asChild>
                                                        <a
                                                            href={`https://www.geoportail-urbanisme.gouv.fr/map/#tile=1&lon=${markerPosition.lng}&lat=${markerPosition.lat}&zoom=15`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <ExternalLink className="w-3 h-3 mr-2" />
                                                            Voir sur le Géoportail
                                                        </a>
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-4">
                                    <p className="text-sm">
                                        Aucun document trouvé pour ce point précis. Essayez de sélectionner une zone plus proche du centre de la parcelle.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
