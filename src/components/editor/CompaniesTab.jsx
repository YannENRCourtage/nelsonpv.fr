import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Building, MapPin, Info, ExternalLink, Loader2, Navigation, FileText, PieChart, Users, Calendar, Globe, Briefcase, Maximize2, Layers } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, ScaleControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const secondaryCompanyIcon = (name, isSelected) => L.divIcon({
  html: `<div class="flex items-center gap-2 group transition-all" style="z-index: ${isSelected ? 1000 : 1}">
           <div class="w-3 h-3 rounded-full border-2 border-white shadow-md ${isSelected ? 'bg-amber-500 scale-150 shadow-amber-200' : 'bg-blue-600 outline outline-4 outline-blue-600/10'}"></div>
           <div class="${isSelected ? 'flex' : 'hidden group-hover:flex'} bg-white/95 backdrop-blur-sm border border-slate-200 px-2 py-0.5 rounded-md shadow-sm whitespace-nowrap">
             <span class="text-[10px] font-black text-slate-800 tracking-tight uppercase">${name}</span>
           </div>
         </div>`,
  className: 'bg-transparent border-none',
  iconSize: [20, 20],
  iconAnchor: [6, 6],
});

function MapInstanceCapturer({ setMap }) {
  const map = useMap();
  useEffect(() => {
    setMap(map);
  }, [map, setMap]);
  return null;
}

function MapSync({ onMove }) {
  useMapEvents({
    moveend: (e) => {
      const map = e.target;
      onMove({
        center: map.getCenter(),
        zoom: map.getZoom()
      });
    }
  });
  return null;
}

export default function CompaniesTab({ project, companies = [], setCompanies, selectedCompany, setSelectedCompany }) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(2); // km
  const [autoLoad, setAutoLoad] = useState(true);
  const lastCoordsRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);

  const fetchCompanies = useCallback(async (query = '', lat = null, lon = null, r = radius) => {
    setLoading(true);
    try {
      // Utilisation de l'API MELODI (Proxy unifié SIRENE/URSSAF/MELODI)
      let url = `/api/melodi?per_page=20`;
      if (query) {
        url += `&q=${encodeURIComponent(query)}`;
      } else if (lat && lon) {
        url += `&lat=${lat}&lon=${lon}&radius=${r}&near=1`;
      }

      const res = await fetch(url);
      if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Erreur lors de la récupération des sociétés');
      }
      const data = await res.json();
      
      const formatted = (data.results || []).map(c => ({
        id: c.siren + (c.siege?.siret || ''),
        name: c.nom_complet,
        siren: c.siren,
        siret: c.siege?.siret,
        address: c.siege?.geo_adresse,
        lat: parseFloat(c.siege?.latitude),
        lon: parseFloat(c.siege?.longitude),
        activity: c.activite_principale,
        activityLabel: c.libelle_activite_principale,
        section: c.section,
        category: c.categorie_entreprise,
        dateCreation: c.date_creation,
        trancheEffectif: c.tranche_effectif_salarie,
        etat: c.etat_administratif,
        natureJuridique: c.nature_juridique_libelle || c.nature_juridique,
        dirigeants: c.dirigeants || [],
        finances: c.finances || {},
      })).filter(c => !isNaN(c.lat) && !isNaN(c.lon));

      setCompanies(formatted);
    } catch (err) {
      console.error(err);
      toast({ 
        title: "Erreur de chargement", 
        description: err.message || "Impossible de charger les sociétés. Vérifiez l'état de l'API SIRENE.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  }, [radius, setCompanies]);

  // Handle map movement events from ANY map (sidebar map or main map)
  useEffect(() => {
    const handleMapMove = (e) => {
      if (!autoLoad) return;
      const { center, zoom } = e.detail;
      if (zoom < 14) return; 

      const dist = lastCoordsRef.current ? 
        Math.sqrt(Math.pow(center.lat - lastCoordsRef.current.lat, 2) + Math.pow(center.lng - lastCoordsRef.current.lng, 2)) : 
        1000;

      if (dist > 0.005) { 
        lastCoordsRef.current = center;
        fetchCompanies('', center.lat, center.lng, 2); 
      }
    };

    window.addEventListener('map:idle', handleMapMove);
    return () => window.removeEventListener('map:idle', handleMapMove);
  }, [autoLoad, fetchCompanies]);

  useEffect(() => {
    if (project?.gps && companies.length === 0 && !loading && !selectedCompany) {
      const parts = project.gps.split(',').map(s => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        fetchCompanies('', parts[0], parts[1]);
      }
    }
  }, [project?.gps, fetchCompanies, (companies || []).length, loading, selectedCompany]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchCompanies(searchQuery);
    } else if (project?.gps) {
      const parts = project.gps.split(',').map(s => parseFloat(s.trim()));
      fetchCompanies('', parts[0], parts[1]);
    }
  };

  const handleGotoCompany = (c) => {
     setSelectedCompany(c);
     // Sync BOTH maps if needed, by dispatching the event
     window.dispatchEvent(new CustomEvent('map:goto-location', { detail: { lat: c.lat, lng: c.lon, zoom: 19 } }));
     // If the local map exists, move it too
     if (mapInstance) {
       mapInstance.setView([c.lat, c.lon], 19);
     }
  };

  const onSecondaryMapIdle = (detail) => {
     window.dispatchEvent(new CustomEvent('map:idle', { detail }));
  };

  return (
    <div className="flex h-full w-full bg-white border-l border-gray-200 shadow-xl overflow-hidden font-sans">
      {/* Sidebar List */}
      <div className="w-80 flex flex-col border-r border-gray-100 bg-slate-50 relative z-20">
        <div className="p-4 border-b bg-white space-y-3 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              Données MELODI / RSI
            </h3>
            <div className="flex items-center gap-2" title="Chargement automatique lors du déplacement de la carte">
               <span className="text-[10px] text-slate-400 font-bold uppercase">Auto</span>
               <input 
                  type="checkbox" 
                  checked={autoLoad} 
                  onChange={(e) => setAutoLoad(e.target.checked)} 
                  className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
               />
            </div>
          </div>
          
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Siren, Nom, Activité..."
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white h-9 rounded-xl transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium px-1 uppercase tracking-wider">
             <span>Rayon : {radius} km</span>
             <input 
                type="range" 
                min="0.5" 
                max="20" 
                step="0.5"
                value={radius} 
                onChange={(e) => setRadius(parseFloat(e.target.value))}
                className="w-24 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
             />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
              <p className="text-xs font-medium uppercase tracking-widest">Recherche...</p>
            </div>
          ) : (companies || []).length > 0 ? (
            <div className="p-2 space-y-1">
              <div className="px-2 py-1 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase italic">
                 <span>{(companies || []).length} résultats</span>
              </div>
              {companies.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleGotoCompany(c)}
                  className={cn(
                    "p-3 cursor-pointer rounded-xl transition-all group relative border",
                    selectedCompany?.id === c.id 
                      ? "bg-white border-blue-200 shadow-md translate-x-1" 
                      : "bg-transparent border-transparent hover:bg-white hover:border-slate-100 hover:shadow-sm"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-slate-900 leading-tight text-sm group-hover:text-blue-600 line-clamp-2" title={c.name}>
                      {c.name}
                    </h4>
                    {c.etat === 'A' && <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1" title="Actif" />}
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-slate-200 text-slate-500 bg-white font-medium truncate max-w-[200px]">
                      {c.activity}
                    </Badge>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2 flex items-start gap-1">
                    <MapPin className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{c.address}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 mt-10">
              <Building className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <p className="text-sm font-medium">Aucun résultat</p>
              <p className="text-[10px] uppercase mt-2 opacity-60">Zoomez ou déplacez la carte</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-6 rounded-full text-[10px] uppercase font-bold"
                onClick={() => {
                   if (project?.gps) {
                      const parts = project.gps.split(',').map(s => parseFloat(s.trim()));
                      fetchCompanies('', parts[0], parts[1]);
                   }
                }}
              >
                Réinitialiser la vue
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Area / Interactive Map */}
      <div className="flex-1 bg-white relative flex flex-col overflow-hidden">
          {selectedCompany ? (
            <div className="flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Header Section */}
                <div className="p-6 md:p-10 bg-slate-50/50 border-b relative">
                    <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
                        <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl border border-blue-50 flex items-center justify-center flex-shrink-0 self-start">
                            <Building className="w-12 h-12 text-blue-600" />
                        </div>
                        <div className="flex-1 text-center md:text-left pt-2 relative">
                            <button 
                                onClick={() => setSelectedCompany(null)}
                                className="absolute -top-4 -right-4 p-2 text-slate-300 hover:text-slate-600 transition-colors"
                                title="Retour à la carte"
                            >
                                <Maximize2 className="w-5 h-5" />
                            </button>
                            <h2 className="text-2xl font-black text-slate-900 mb-2 leading-none tracking-tight">{selectedCompany.name}</h2>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 mt-3">
                                <span className="text-blue-700 font-bold px-3 py-1 bg-blue-100 rounded-lg text-[11px] flex items-center gap-1.5 uppercase tracking-wider">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    {selectedCompany.activityLabel || selectedCompany.activity}
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-400 text-sm font-medium">
                                    <MapPin className="w-4 h-4 text-slate-300" />
                                    {selectedCompany.address}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content with Tabs */}
                <div className="flex-1 overflow-hidden flex flex-col px-6 md:px-10 pb-6">
                    <Tabs defaultValue="infos" className="w-full h-full flex flex-col mt-6">
                        <TabsList className="bg-slate-100/50 p-1 rounded-2xl w-fit mb-6">
                            <TabsTrigger value="infos" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl px-6 font-bold text-[11px] uppercase tracking-wider h-10">
                                <Info className="w-3.5 h-3.5 mr-2" />
                                Identité
                            </TabsTrigger>
                            <TabsTrigger value="finance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl px-6 font-bold text-[11px] uppercase tracking-wider h-10">
                                <PieChart className="w-3.5 h-3.5 mr-2" />
                                Finances
                            </TabsTrigger>
                            <TabsTrigger value="docs" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl px-6 font-bold text-[11px] uppercase tracking-wider h-10">
                                <Building className="w-3.5 h-3.5 mr-2" />
                                Etablissements
                            </TabsTrigger>
                            <TabsTrigger value="links" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl px-6 font-bold text-[11px] uppercase tracking-wider h-10">
                                <Globe className="w-3.5 h-3.5 mr-2" />
                                Liens utiles
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <TabsContent value="infos" className="mt-0 space-y-8 pb-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <InfoCard label="SIREN" value={selectedCompany.siren} icon={<Building className="w-3.5 h-3.5"/>} mono />
                                    <InfoCard label="SIRET Siège" value={selectedCompany.siret} icon={<Briefcase className="w-3.5 h-3.5"/>} mono />
                                    <InfoCard label="Nature Juridique" value={selectedCompany.natureJuridique || 'Non spécifié'} icon={<Info className="w-3.5 h-3.5"/>} />
                                    <InfoCard label="Catégorie" value={selectedCompany.category || 'PME'} icon={<Users className="w-3.5 h-3.5"/>} />
                                    <InfoCard label="Création" value={selectedCompany.dateCreation} icon={<Calendar className="w-3.5 h-3.5"/>} />
                                    <InfoCard label="Effectifs" value={selectedCompany.trancheEffectif || 'Non renseigné'} icon={<Users className="w-3.5 h-3.5"/>} />
                                </div>

                                {selectedCompany.dirigeants && selectedCompany.dirigeants.length > 0 && (
                                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1.5 mb-4 px-1">
                                            <Users className="w-3.5 h-3.5"/>
                                            Dirigeants
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCompany.dirigeants.slice(0, 6).map((d, idx) => (
                                                <div key={idx} className="bg-white border border-slate-100 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-sm hover:border-blue-200 transition-all group/dir">
                                                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-[10px] group-hover/dir:bg-blue-600 group-hover/dir:text-white transition-colors">
                                                        {d.nom ? d.nom[0] : (d.prenoms ? d.prenoms[0] : '?')}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-slate-800 leading-tight">
                                                            {d.prenoms} {d.nom}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight mt-0.5">
                                                            {d.qualite || (d.fonction_ou_role ? d.fonction_ou_role : 'Mandataire')}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-100 flex flex-col md:flex-row items-center gap-10">
                                     <div className="flex-1">
                                        <h4 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Potentiel Solaire</h4>
                                        <p className="text-slate-500 text-sm leading-relaxed max-w-lg">
                                            Cette entreprise dispose d'une infrastructure favorable à l'installation de panneaux solaires. 
                                            Analysez la surface de toiture disponible pour estimer la capacité de production photovoltaïque.
                                        </p>
                                        <Button 
                                            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-black px-10 h-14 rounded-[1.5rem] shadow-xl shadow-blue-200 flex items-center gap-2 transition-all hover:-translate-y-1 active:scale-95"
                                            onClick={() => window.dispatchEvent(new CustomEvent('map:goto-location', { detail: { lat: selectedCompany.lat, lng: selectedCompany.lon, zoom: 19 } }))}
                                        >
                                            <Navigation className="w-5 h-5" />
                                            Démarrer l'étude
                                        </Button>
                                     </div>
                                     <div className="w-48 h-48 bg-blue-600 rounded-[2.5rem] flex flex-col items-center justify-center text-white relative overflow-hidden group shadow-2xl shadow-blue-300">
                                         <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                                         <Building className="w-24 h-24 opacity-10 absolute -bottom-6 -right-6 rotate-12 group-hover:scale-110 transition-transform" />
                                         <span className="text-4xl font-black mb-1 tracking-tighter italic">Bientôt</span>
                                         <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-80">Solar Rank</span>
                                     </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="finance" className="mt-0 pb-10">
                                <div className="py-20 text-center border-4 border-dashed border-slate-50 rounded-[4rem]">
                                    <PieChart className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                                    <h5 className="text-xl font-black text-slate-300 tracking-tight">Données confidentielles</h5>
                                    <p className="text-sm text-slate-300 max-w-xs mx-auto mt-2 leading-relaxed">Les bilans et comptes de résultats ne sont pas disponibles en libre accès pour cette entité Sirene.</p>
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="docs" className="mt-0 pb-10">
                                <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b">
                                            <tr>
                                                <th className="px-8 py-5">Nom / SIRET</th>
                                                <th className="px-8 py-5">Adresse</th>
                                                <th className="px-8 py-5">État</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            <tr className="hover:bg-slate-50/30 transition-colors">
                                                <td className="px-8 py-6">
                                                    <p className="font-bold text-slate-900">Siège Social</p>
                                                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">{selectedCompany.siret}</p>
                                                </td>
                                                <td className="px-8 py-6 text-slate-600 text-[12px] font-medium leading-relaxed">{selectedCompany.address}</td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-green-700">Ouvert</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </TabsContent>

                            <TabsContent value="links" className="mt-0 space-y-3 pb-10 max-w-xl">
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6 ml-1">Ressources officielles externes</p>
                                <LinkRow label="Annuaire des Entreprises" url={`https://annuaire-entreprises.data.gouv.fr/entreprise/${selectedCompany.siren}`} color="blue" />
                                <LinkRow label="Societe.com" url={`https://www.societe.com/cgi-bin/search?champs=${selectedCompany.siren}`} color="slate" />
                                <LinkRow label="Pappers" url={`https://www.pappers.fr/entreprise/${selectedCompany.siren}`} color="slate" />
                                <LinkRow label="Infogreffe" url={`https://www.infogreffe.fr/recherche-entreprise-dirigeant/resultats-recherche-entreprise-dirigeant?siren=${selectedCompany.siren}`} color="slate" />
                                <LinkRow label="Google Maps" url={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCompany.name + ' ' + selectedCompany.address)}`} color="slate" />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
          ) : (
            <div className="flex-1 relative bg-slate-100 flex flex-col h-full overflow-hidden">
                <MapContainer
                    center={project?.gps ? project.gps.split(',').map(s => parseFloat(s.trim())) : [46.2276, 2.2137]}
                    zoom={project?.gps ? 14 : 6}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <MapInstanceCapturer setMap={setMapInstance} />
                    <MapSync onMove={onSecondaryMapIdle} />
                    <ScaleControl position="bottomright" />
                    
                    {(companies || []).map(c => (
                        <Marker
                            key={c.id}
                            position={[c.lat, c.lon]}
                            icon={secondaryCompanyIcon(c.name, false)}
                            eventHandlers={{
                                click: () => setSelectedCompany(c)
                            }}
                        >
                            <Popup>
                                <div className="p-2 min-w-[200px] text-center">
                                    <p className="font-black text-slate-800 text-sm mb-1">{c.name}</p>
                                    <p className="text-[10px] italic text-slate-400 mb-2">{c.address}</p>
                                    <Button size="sm" className="h-7 text-[10px] w-full bg-blue-600" onClick={() => setSelectedCompany(c)}>Détails</Button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* Overlays on map */}
                <div className="absolute top-6 right-6 pointer-events-none z-[1000] flex flex-col items-end gap-3">
                    <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-white flex items-center gap-4 pointer-events-auto animate-in slide-in-from-top-4 duration-700">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                           <Globe className="w-5 h-5 animate-spin-slow" />
                        </div>
                        <div>
                           <p className="text-slate-900 font-black tracking-tight text-sm leading-none">Exploration Interactive</p>
                           <p className="text-slate-500 text-[10px] font-bold uppercase mt-1">Déplacez-vous pour découvrir</p>
                        </div>
                    </div>
                </div>
                
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-[1000] animate-in slide-in-from-bottom-4 duration-700">
                     <div className="bg-slate-900/90 backdrop-blur-md px-6 py-2 rounded-full text-white text-[10px] font-bold uppercase tracking-[0.3em] shadow-2xl flex items-center gap-3">
                        <Loader2 className={cn("w-3 h-3 animate-spin", !loading && "hidden")} />
                        {loading ? 'Recherche en cours...' : 'Prêt à explorer'}
                     </div>
                </div>

                {/* Legend Overlay */}
                <div className="absolute bottom-10 right-6 z-[1000] bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-slate-100 pointer-events-auto">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Source des données</p>
                    <div className="space-y-1.5 font-bold text-[10px] text-slate-600">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                            <span>Sirene (INSEE)</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-green-500" />
                             <span>MELODI API</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-slate-400" />
                             <span>URSSAF Open Data</span>
                        </div>
                    </div>
                </div>
            </div>
          )}
      </div>
    </div>
  );
}

function InfoCard({ label, value, icon, mono }) {
    return (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm transition-all hover:bg-slate-50/50 hover:shadow-md hover:border-blue-100 group">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1.5 mb-2.5 opacity-80 group-hover:opacity-100 group-hover:text-blue-500 transition-colors">
                {icon}
                {label}
            </p>
            <p className={cn("text-slate-900 font-bold tracking-tight text-sm truncate", mono && "font-mono text-xs text-slate-700")}>
                {value || '-'}
            </p>
        </div>
    );
}

function LinkRow({ label, url, color }) {
    return (
        <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between p-5 bg-slate-50/50 hover:bg-white rounded-[1.5rem] border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/50 transition-all group active:scale-[0.98]"
        >
            <span className="font-bold text-slate-700 text-sm flex items-center gap-3">
                <div className={cn("w-2.5 h-2.5 rounded-full shadow-inner", color === 'blue' ? 'bg-blue-600' : 'bg-slate-300')} />
                {label}
            </span>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border opacity-0 group-hover:opacity-100 transition-all">
                <ExternalLink className="w-4 h-4 text-blue-600" />
            </div>
        </a>
    );
}
