import React, { useState, useEffect, useCallback } from 'react';
import { Search, Building, MapPin, Info, ExternalLink, Loader2, Navigation } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function CompaniesTab({ project, companies, setCompanies, selectedCompany, setSelectedCompany }) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(5); // km

  const fetchCompanies = useCallback(async (query = '', lat = null, lon = null) => {
    setLoading(true);
    try {
      let url = `/api/sirene?per_page=100`;
      if (query) url += `&q=${encodeURIComponent(query)}`;
      if (lat && lon) url += `&lat=${lat}&lon=${lon}&radius=${radius}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Erreur lors de la récupération des sociétés');
      const data = await res.json();
      
      // Map results to a consistent format
      const formatted = (data.results || []).map(c => ({
        id: c.siren + (c.siege?.siret || ''),
        name: c.nom_complet,
        siren: c.siren,
        siret: c.siege?.siret,
        address: c.siege?.geo_adresse,
        lat: parseFloat(c.siege?.latitude),
        lon: parseFloat(c.siege?.longitude),
        activity: c.activite_principale,
        section: c.section,
        category: c.categorie_entreprise,
        dateCreation: c.date_creation,
        trancheEffectif: c.tranche_effectif_salarie,
      })).filter(c => !isNaN(c.lat) && !isNaN(c.lon));

      setCompanies(formatted);
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Impossible de charger les sociétés.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [radius, setCompanies]);

  useEffect(() => {
    if (project?.gps && companies.length === 0 && !loading) {
      const parts = project.gps.split(',').map(s => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        fetchCompanies('', parts[0], parts[1]);
      }
    }
  }, [project?.gps, fetchCompanies, companies.length, loading]);

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
     // Dispatch event to focus map - assumed event listener in MapElements
     window.dispatchEvent(new CustomEvent('map:goto-location', { detail: { lat: c.lat, lng: c.lon, zoom: 18 } }));
  };

  return (
    <div className="flex h-full w-full bg-white border-l border-gray-200 shadow-xl overflow-hidden">
      {/* Sidebar List */}
      <div className="w-80 flex flex-col border-r border-gray-100 bg-gray-50/50">
        <div className="p-4 border-b bg-white space-y-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            Sociétés à proximité
          </h3>
          
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Nom, SIREN, Activité..."
              className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
             <span>Rayon : {radius} km</span>
             <input 
                type="range" 
                min="1" 
                max="50" 
                value={radius} 
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
             />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Recherche en cours...</p>
            </div>
          ) : companies.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {companies.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleGotoCompany(c)}
                  className={cn(
                    "p-4 cursor-pointer transition-all hover:bg-white group relative",
                    selectedCompany?.id === c.id ? "bg-white border-l-4 border-blue-500 shadow-sm" : "border-l-4 border-transparent"
                  )}
                >
                  <h4 className="font-semibold text-gray-900 leading-tight group-hover:text-blue-600 truncate" title={c.name}>
                    {c.name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal opacity-70">
                      {c.activity}
                    </Badge>
                  </p>
                  <p className="text-[11px] text-gray-400 mt-2 flex items-start gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{c.address}</span>
                  </p>
                  
                  {selectedCompany?.id === c.id && (
                    <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">SIREN</div>
                        <div className="text-[11px] text-gray-700 font-mono">{c.siren}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Effectifs</div>
                        <div className="text-[11px] text-gray-700">{c.trancheEffectif || 'Non renseigné'}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Création</div>
                        <div className="text-[11px] text-gray-700">{c.dateCreation}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              <Building className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Aucune société trouvée dans cette zone.</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-4 text-blue-600"
                onClick={() => {
                  if (project?.gps) {
                    const parts = project.gps.split(',').map(s => parseFloat(s.trim()));
                    fetchCompanies('', parts[0], parts[1]);
                  }
                }}
              >
                Réessayer la recherche
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Area / Map Controls View */}
      <div className="flex-1 bg-gray-50 relative flex flex-col">
          {selectedCompany ? (
            <div className="p-8 max-w-2xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                        <Building className="w-10 h-10 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-2 leading-tight">{selectedCompany.name}</h2>
                    <p className="text-blue-600 font-medium px-4 py-1 bg-blue-50 rounded-full text-sm mb-4">
                        {selectedCompany.activity}
                    </p>
                    <div className="flex items-center gap-2 text-gray-500 mb-8">
                        <MapPin className="w-4 h-4" />
                        <span className="text-lg">{selectedCompany.address}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full text-left">
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">SIREN</p>
                            <p className="font-mono text-gray-700">{selectedCompany.siren}</p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">SIRET Siège</p>
                            <p className="font-mono text-sm text-gray-700">{selectedCompany.siret}</p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Catégorie</p>
                            <p className="font-medium text-gray-700">{selectedCompany.category || 'PME'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Section</p>
                            <p className="font-medium text-gray-700 truncate" title={selectedCompany.section}>{selectedCompany.section}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-8 w-full">
                        <Button 
                            className="bg-blue-600 hover:bg-blue-700 flex-1 h-12 rounded-xl text-lg font-bold shadow-lg shadow-blue-200"
                            onClick={() => window.open(`https://annuaire-entreprises.data.gouv.fr/entreprise/${selectedCompany.siren}`, '_blank')}
                        >
                            <ExternalLink className="w-5 h-5 mr-2" />
                            Voir sur l'Annuaire
                        </Button>
                        <Button 
                            variant="outline"
                            className="flex-1 h-12 rounded-xl border-2 border-gray-100 font-bold hover:bg-gray-50 transition-colors"
                            onClick={() => window.dispatchEvent(new CustomEvent('map:goto-location', { detail: { lat: selectedCompany.lat, lng: selectedCompany.lon, zoom: 19 } }))}
                        >
                            <Navigation className="w-5 h-5 mr-2" />
                            Centrer sur la carte
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                         <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                             <Info className="w-4 h-4 text-blue-500" />
                             Informations Légales
                         </h4>
                         <div className="space-y-4">
                             <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                 <span className="text-sm text-gray-500">Date de création</span>
                                 <span className="text-sm font-medium">{selectedCompany.dateCreation}</span>
                             </div>
                             <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                 <span className="text-sm text-gray-500">Tranche d'effectifs</span>
                                 <span className="text-sm font-medium">{selectedCompany.trancheEffectif || 'Inconnu'}</span>
                             </div>
                             <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                 <span className="text-sm text-gray-500">Lat / Lon</span>
                                 <span className="text-sm font-mono">{selectedCompany.lat.toFixed(6)}, {selectedCompany.lon.toFixed(6)}</span>
                             </div>
                         </div>
                    </div>
                    
                    <div className="bg-blue-600 rounded-3xl p-8 shadow-xl text-white flex flex-col justify-center items-center relative overflow-hidden group">
                        <Building className="w-24 h-24 absolute -bottom-4 -right-4 text-white/10 rotate-12 group-hover:scale-110 transition-transform" />
                        <h4 className="text-xl font-black mb-2 relative z-10">Potentiel Solaire</h4>
                        <p className="text-center text-blue-100 text-sm relative z-10">Analysez la toiture de cette entreprise pour évaluer son potentiel de production photovoltaïque.</p>
                        <Button 
                            className="mt-6 bg-white text-blue-700 hover:bg-blue-50 font-black px-8 h-12 rounded-2xl relative z-10"
                            onClick={() => window.dispatchEvent(new CustomEvent('map:goto-location', { detail: { lat: selectedCompany.lat, lng: selectedCompany.lon, zoom: 19 } }))}
                        >
                            Démarrer l'étude
                        </Button>
                    </div>
                </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-8 relative">
                    <Building className="w-16 h-16 text-gray-300" />
                    <div className="absolute inset-0 border-4 border-dashed border-gray-200 rounded-full animate-spin-slow" />
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-4">Sélectionnez une entreprise</h3>
                <p className="text-gray-500 max-w-sm">
                    Utilisez la liste à gauche ou la barre de recherche pour trouver une société et afficher ses détails.
                </p>
                
                <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-md">
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-left">
                        <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center mb-3">
                            <Navigation className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="font-bold text-gray-800 text-sm">Géo-recherche</p>
                        <p className="text-xs text-gray-500">Trouvez les sociétés proches du projet.</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-left">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center mb-3">
                            <Info className="w-4 h-4 text-amber-600" />
                        </div>
                        <p className="font-bold text-gray-800 text-sm">Infos Siren</p>
                        <p className="text-xs text-gray-500">Accédez aux données légales complètes.</p>
                    </div>
                </div>
            </div>
          )}
      </div>
    </div>
  );
}
