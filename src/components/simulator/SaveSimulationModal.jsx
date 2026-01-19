import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { listProjects } from '@/services/firebase/firestore.service.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

export default function SaveSimulationModal({ isOpen, onClose, onSave }) {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Charger les projets au montage du modal
    useEffect(() => {
        if (isOpen) {
            loadProjects();
        }
    }, [isOpen]);

    // Filtrer les projets selon la recherche
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredProjects(projects);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = projects.filter(project => {
                const projectName = `${project.name || ''} ${project.zip || ''} ${project.city || ''}`.toLowerCase();
                return projectName.includes(query);
            });
            setFilteredProjects(filtered);
        }
    }, [searchQuery, projects]);

    const loadProjects = async () => {
        try {
            setIsLoading(true);
            // Admin peut voir tous les projets
            const canViewAll = user?.role === 'admin' || user?.role === 'Administrator';
            const projectsList = await listProjects(user?.id, canViewAll);
            setProjects(projectsList);
            setFilteredProjects(projectsList);
        } catch (error) {
            console.error('Erreur chargement projets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = () => {
        if (selectedProject) {
            onSave(selectedProject);
            handleClose();
        }
    };

    const handleClose = () => {
        setSearchQuery('');
        setSelectedProject(null);
        onClose();
    };

    const getProjectDisplayName = (project) => {
        const name = `${project.name || ''} ${project.zip || ''} ${project.city || ''}`.trim();
        return name || 'Projet sans nom';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
                {/* En-tête */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">
                        Sauvegarder la simulation
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Contenu */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Barre de recherche */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rechercher un projet
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Nom, code postal, ville..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Liste des projets */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sélectionner un projet ({filteredProjects.length})
                        </label>

                        {isLoading ? (
                            <div className="text-center py-8 text-gray-500">
                                Chargement des projets...
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Aucun projet trouvé
                            </div>
                        ) : (
                            <div className="border border-gray-300 rounded-lg max-h-80 overflow-y-auto">
                                {filteredProjects.map((project) => (
                                    <div
                                        key={project.id}
                                        onClick={() => setSelectedProject(project)}
                                        className={`p-3 cursor-pointer border-b border-gray-200 last:border-b-0 transition-colors ${selectedProject?.id === project.id
                                                ? 'bg-teal-50 border-l-4 border-l-teal-500'
                                                : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="font-medium text-gray-900">
                                            {getProjectDisplayName(project)}
                                        </div>
                                        {project.type && (
                                            <div className="text-sm text-gray-600 mt-1">
                                                Type: {project.type}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer avec boutons */}
                <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                    <Button
                        onClick={handleClose}
                        variant="outline"
                        className="rounded-full"
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!selectedProject}
                        className="rounded-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Sauvegarder
                    </Button>
                </div>
            </div>
        </div>
    );
}
