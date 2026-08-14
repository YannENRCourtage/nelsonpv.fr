import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, Search, MapPin, Zap, Navigation, Building, Sun, Battery,
  CheckCircle2, Clock, AlertCircle, Calendar, ArrowRight, GripVertical, Filter
} from 'lucide-react';

/**
 * DossiersGridView — Vue "Dossiers" en vignettes horizontales déplaçables
 * Affiche tous les dossiers (notamment issus de la phase CRM) avec filtres de statut,
 * barres de progression, détails sur 2 lignes et sélection directe pour passer à l'onglet Urbanisme.
 */
export default function DossiersGridView({ projects = [], onSelectProject, activeProjectId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'en_attente', 'en_cours', 'termine'
  const [projectList, setProjectList] = useState(projects);

  // Mettre à jour projectList quand les projets changent
  React.useEffect(() => {
    setProjectList(projects);
  }, [projects]);

  // Filtrage des dossiers
  const filteredProjects = projectList.filter(p => {
    const matchSearch = searchTerm === '' ||
      (p.name || p.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.address || '').toLowerCase().includes(searchTerm.toLowerCase());

    const status = (p.status || p.crm_status || 'en_cours').toLowerCase();

    if (statusFilter === 'all') return matchSearch;
    if (statusFilter === 'termine') return matchSearch && (status.includes('termin') || status.includes('valid'));
    if (statusFilter === 'en_attente') return matchSearch && (status.includes('attente') || status.includes('nouveau'));
    if (statusFilter === 'en_cours') return matchSearch && !status.includes('termin') && !status.includes('attente');

    return matchSearch;
  });

  // Séparer les projets filtrés en 2 rangées horizontales équilibrées
  const row1 = filteredProjects.filter((_, idx) => idx % 2 === 0);
  const row2 = filteredProjects.filter((_, idx) => idx % 2 !== 0);

  // Gestion du glisser-déplacer (Drag & Drop HTML5)
  const [draggedIdx, setDraggedIdx] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;

    const updated = [...projectList];
    const [movedItem] = updated.splice(draggedIdx, 1);
    updated.splice(targetIdx, 0, movedItem);
    setProjectList(updated);
    setDraggedIdx(null);
  };

  // Calcul du statut & avancement fictif ou réel
  const getProjectProgress = (p) => {
    if (p.progress !== undefined) return p.progress;
    const status = (p.status || '').toLowerCase();
    if (status.includes('termin')) return 100;
    if (status.includes('attente')) return 25;
    return 65; // Par défaut en cours
  };

  const getStepRatio = (p) => {
    const progress = getProjectProgress(p);
    const totalSteps = 12;
    const done = Math.round((progress / 100) * totalSteps);
    return `${done}/${totalSteps}`;
  };

  const getStatusBadge = (p) => {
    const status = (p.status || p.crm_status || 'En cours').toLowerCase();
    if (status.includes('termin') || status.includes('valid')) {
      return (
        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terminé
        </span>
      );
    }
    if (status.includes('attente') || status.includes('nouveau')) {
      return (
        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-amber-600" /> En attente
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold flex items-center gap-1">
        <Clock className="w-3 h-3 text-blue-600 animate-pulse" /> En cours
      </span>
    );
  };

  const renderCard = (project, globalIdx) => {
    const clientName = `${project.firstName || ''} ${project.name || project.lastName || ''}`.trim() || 'Dossier Client';
    const folderNum = project.dossier_num || `DOS-${(project.id || globalIdx + 100).toString().slice(-4)}`;
    const progress = getProjectProgress(project);
    const stepRatio = getStepRatio(project);
    const isSelected = activeProjectId === project.id;

    return (
      <div
        key={project.id || globalIdx}
        draggable
        onDragStart={(e) => handleDragStart(e, globalIdx)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, globalIdx)}
        onClick={() => onSelectProject(project)}
        className={`flex-shrink-0 w-[440px] bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-sm hover:shadow-md relative group select-none ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-gray-200 hover:border-blue-300'
        }`}
      >
        {/* Poignée de déplacement */}
        <div className="absolute top-3 left-2 text-gray-300 group-hover:text-gray-400 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="pl-4 space-y-3">
          {/* LIGNE 1 : Numéro, Nom, Statut, Pourcentage, Nombre d'étapes */}
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md uppercase tracking-wider flex-shrink-0">
                {folderNum}
              </span>
              <h3 className="font-extrabold text-sm text-gray-900 truncate" title={clientName}>
                {clientName}
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusBadge(project)}
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-blue-600">{progress}%</span>
                <span className="text-[10px] font-bold text-gray-400">{stepRatio} étapes</span>
              </div>
            </div>
          </div>

          {/* LIGNE 2 : Adresse, Type, GPS, Puissance, Date modif, Étape en cours */}
          <div className="space-y-2 text-xs text-gray-600">
            {/* Adresse & GPS */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1 font-medium text-gray-700 truncate max-w-[240px]">
                <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span className="truncate">{project.address || `${project.city || 'Mérignac'} (33)`}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-400 font-mono text-[10px]">
                <Navigation className="w-3 h-3 text-blue-400" />
                <span>{project.gps || '44.407, -0.830'}</span>
              </div>
            </div>

            {/* Type, Puissance, Date & Étape */}
            <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  {project.type || 'Bâtiment Solaire'}
                </span>
                <span className="font-extrabold text-blue-600 flex items-center gap-0.5">
                  <Zap className="w-3 h-3 fill-blue-500 text-blue-500" />
                  {project.kwc ? (project.kwc.toString().includes('kWc') ? project.kwc : `${project.kwc} kWc`) : '119 kWc'}
                </span>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-semibold text-gray-400 flex items-center gap-1 justify-end">
                  <Calendar className="w-3 h-3" />
                  {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString('fr-FR') : '13/08/2026'}
                </div>
                <div className="text-[10px] font-bold text-purple-700 truncate max-w-[130px]">
                  Étape : {project.current_step || 'Dépôt Urbanisme'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Barre de Recherche et Filtres */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-600" />
            Gestion des Dossiers
          </h2>
          <p className="text-xs text-gray-500">
            Retrouvez tous vos dossiers terminés ou en cours. Glissez-déposez pour réorganiser.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Recherche */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filtrer dossier, client, ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Filtre de Statut */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'en_cours', label: 'En cours' },
              { id: 'en_attente', label: 'En attente' },
              { id: 'termine', label: 'Terminé' },
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setStatusFilter(btn.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === btn.id ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Affichage des vignettes en 2 lignes horizontales défilantes */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
          <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-700 text-sm">Aucun dossier ne correspond à votre recherche</p>
        </div>
      ) : (
        <div className="space-y-4 overflow-hidden">
          {/* Rangée 1 */}
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-2 px-1">
              Rangée 1 ({row1.length} dossiers)
            </span>
            <div className="flex items-center gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {row1.map((p, idx) => renderCard(p, idx * 2))}
            </div>
          </div>

          {/* Rangée 2 */}
          {row2.length > 0 && (
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block mb-2 px-1">
                Rangée 2 ({row2.length} dossiers)
              </span>
              <div className="flex items-center gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {row2.map((p, idx) => renderCard(p, idx * 2 + 1))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
