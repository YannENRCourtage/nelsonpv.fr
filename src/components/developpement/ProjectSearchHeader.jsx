import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Zap, Map, Ruler, X, Navigation, Building, Battery, Sun, MessageSquare, Save, Check } from 'lucide-react';

export default function ProjectSearchHeader({ projects = [], selectedProject, onSelectProject, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [projectComments, setProjectComments] = useState('');
  const [isCommentSaved, setIsCommentSaved] = useState(false);
  const wrapperRef = useRef(null);

  // Charger les commentaires locaux pour le projet sélectionné
  useEffect(() => {
    if (selectedProject?.id) {
      const saved = localStorage.getItem(`nelson_comment_${selectedProject.id}`) || selectedProject.notes || '';
      setProjectComments(saved);
    }
  }, [selectedProject]);

  const handleSaveComment = (val) => {
    setProjectComments(val);
    if (selectedProject?.id) {
      localStorage.setItem(`nelson_comment_${selectedProject.id}`, val);
      setIsCommentSaved(true);
      setTimeout(() => setIsCommentSaved(false), 2000);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter projects dynamically as user types or on mount/focus
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      setFilteredProjects(projects.slice(0, 15));
      return;
    }

    const normalize = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cleanTerm = normalize(term);

    const results = projects.filter(p => {
      const lastName = normalize(p.name || p.lastName || '');
      const firstName = normalize(p.firstName || '');
      const city = normalize(p.city || p.cadastre_commune || '');
      const address = normalize(p.address || '');
      const zip = normalize(p.zip || p.zipCode || '');

      return lastName.includes(cleanTerm) ||
             firstName.includes(cleanTerm) ||
             city.includes(cleanTerm) ||
             address.includes(cleanTerm) ||
             zip.includes(cleanTerm);
    });

    results.sort((a, b) => {
      const aName = normalize(a.name || a.lastName || '');
      const bName = normalize(b.name || b.lastName || '');
      const aCity = normalize(a.city || '');
      const bCity = normalize(b.city || '');

      const aStarts = aName.startsWith(cleanTerm) || aCity.startsWith(cleanTerm) || (a.firstName && normalize(a.firstName).startsWith(cleanTerm));
      const bStarts = bName.startsWith(cleanTerm) || bCity.startsWith(cleanTerm) || (b.firstName && normalize(b.firstName).startsWith(cleanTerm));

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });

    setFilteredProjects(results.slice(0, 15));
    setIsDropdownOpen(true);
    setSelectedIndex(-1);
  }, [searchTerm, projects]);

  const handleKeyDown = (e) => {
    if (!isDropdownOpen) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredProjects.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredProjects.length) {
        handleSelectProject(filteredProjects[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleSelectProject = (project) => {
    onSelectProject(project);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const clearSelection = () => {
    onSelectProject(null);
  };

  const getTypeIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'batterie': return <Battery className="w-4 h-4 mr-1" />;
      case 'bâtiment': 
      case 'batiment':
      case 'batiment_solaire': return <Building className="w-4 h-4 mr-1" />;
      case 'ombrière': 
      case 'ombriere': return <Sun className="w-4 h-4 mr-1" />;
      default: return null;
    }
  };

  const handleInputFocus = () => {
    if (projects.length > 0) {
      if (!searchTerm.trim()) {
        setFilteredProjects(projects.slice(0, 15));
      }
      setIsDropdownOpen(true);
    }
  };

  // Calcul du pourcentage d'avancement du projet (par défaut 65% ou 100% si terminé)
  const getProjectProgress = (p) => {
    if (p?.progress !== undefined) return p.progress;
    const st = (p?.status || p?.crm_status || '').toLowerCase();
    if (st.includes('termin')) return 100;
    if (st.includes('attente')) return 30;
    return 65;
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Input Container */}
      <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto z-50">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className={`h-5 w-5 ${loading ? 'text-blue-400 animate-pulse' : 'text-gray-400'}`} />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all cursor-pointer"
            placeholder="Rechercher un projet (nom, ville, adresse, CP)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onClick={handleInputFocus}
          />
        </div>

        {/* Dropdown */}
        <AnimatePresence>
          {isDropdownOpen && filteredProjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-80 overflow-y-auto"
            >
              {filteredProjects.map((project, index) => {
                const clientName = `${project.firstName || ''} ${project.name || project.lastName || ''}`.trim();
                const displayPower = project.kwc || project.projectSize;

                return (
                  <div
                    key={project.id || index}
                    className={`px-4 py-3 cursor-pointer flex justify-between items-center transition-colors border-b border-gray-50 last:border-0 ${
                      index === selectedIndex ? 'bg-blue-50' : 'hover:bg-blue-50'
                    }`}
                    onClick={() => handleSelectProject(project)}
                  >
                    <div>
                      <div className="font-bold text-gray-900">
                        {clientName || 'Projet sans nom'}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                        {project.city} {project.zip || project.zipCode ? `(${project.zip || project.zipCode})` : ''}
                        {project.address ? ` — ${project.address}` : ''}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      {project.type && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800 mb-1">
                          {getTypeIcon(project.type)}
                          {project.type}
                        </span>
                      )}
                      {displayPower && (
                        <span className="text-xs font-bold text-blue-600">
                          {displayPower.toString().toLowerCase().includes('kwc') ? displayPower : `${displayPower} kWc`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Metadata Panel */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden mt-6">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600"></div>
              
              <button 
                onClick={clearSelection}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100 z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* GAUCHE (2/3 de largeur) : Nom client, Frise de progression, Métadonnées */}
                  <div className="lg:col-span-2 space-y-5">
                    {/* Nom et Adresse */}
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                        {selectedProject.firstName} {selectedProject.name || selectedProject.lastName}
                      </h2>
                      <p className="text-sm font-medium text-gray-500 flex items-center mt-1">
                        <MapPin className="w-4 h-4 mr-1 text-red-500 flex-shrink-0" />
                        {selectedProject.address}, {selectedProject.zip || selectedProject.zipCode} {selectedProject.city}
                      </p>
                    </div>

                    {/* Frise horizontale colorée de progression avec pourcentage (remplace le mot Terminé) */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
                        <span className="flex items-center gap-1.5 text-blue-700">
                          Progression du dossier
                        </span>
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[11px] font-black shadow-xs">
                          {getProjectProgress(selectedProject)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${getProjectProgress(selectedProject)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Grille Métadonnées (Type, Puissance, Cadastre, GPS) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                      {/* Type */}
                      <div className="flex items-start space-x-3 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
                          {getTypeIcon(selectedProject.type) || <Building className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-gray-400">Type de projet</p>
                          <p className="font-bold text-xs text-gray-900">{selectedProject.type || 'Non défini'}</p>
                        </div>
                      </div>

                      {/* Puissance */}
                      <div className="flex items-start space-x-3 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-gray-400">Puissance crête</p>
                          <p className="font-bold text-xs text-gray-900">
                            {selectedProject.kwc 
                              ? (selectedProject.kwc.toString().toLowerCase().includes('kwc') ? selectedProject.kwc : `${selectedProject.kwc} kWc`)
                              : selectedProject.projectSize 
                                ? (selectedProject.projectSize.toString().toLowerCase().includes('kwc') ? selectedProject.projectSize : `${selectedProject.projectSize} kWc`)
                                : 'Non défini'}
                          </p>
                        </div>
                      </div>

                      {/* Cadastre */}
                      <div className="flex items-start space-x-3 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                          <Map className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-gray-400">Cadastre</p>
                          <p className="font-bold text-xs text-gray-900">
                            Section {selectedProject.cadastre_section || '-'} n° {selectedProject.cadastre_numero || '-'}
                          </p>
                          {(selectedProject.cadastre_surface) && (
                            <p className="text-[10px] text-gray-500 flex items-center mt-0.5">
                              <Ruler className="w-3 h-3 mr-0.5" />
                              {selectedProject.cadastre_surface} m²
                            </p>
                          )}
                        </div>
                      </div>

                      {/* GPS */}
                      <div className="flex items-start space-x-3 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                          <Navigation className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-gray-400">Coordonnées GPS</p>
                          <p className="font-bold text-xs text-gray-900 truncate" title={selectedProject.gps || 'Non défini'}>
                            {selectedProject.gps || '44.407552, -0.830472'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DROITE (1/3 de largeur) : Zone libre "Commentaires" */}
                  <div className="lg:col-span-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                          Commentaires & Notes du dossier
                        </label>
                        {isCommentSaved && (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Enregistré
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={5}
                        value={projectComments}
                        onChange={(e) => handleSaveComment(e.target.value)}
                        placeholder="Saisissez ici vos commentaires libres, remarques urbanismes ou notes internes..."
                        className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none shadow-xs"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 italic">
                      Les commentaires sont enregistrés automatiquement.
                    </p>
                  </div>

                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
