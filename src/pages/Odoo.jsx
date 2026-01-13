import React, { useState, useMemo, useEffect } from 'react';
import { useProjects } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Search, Clock, Plus, Activity, Send } from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { apiService } from '@/services/api';

// --- CONSTANTS ---
const STAGES = [
    "Déposer la demande sur le portail raccordement",
    "Réaliser la DP",
    "Récupérer l'ARE",
    "Récupérer l'accord ou refus mairie",
    "Récupérer l'accord ou refus ENEDIS"
];

// --- COMPONENTS ---

// 1. KANBAN CARD
const DraggableCard = ({ project, onClick }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'PROJECT_CARD',
        item: { id: project.id },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    const ref = React.useRef(null);
    drag(ref);

    return (
        <div
            ref={ref}
            onClick={() => onClick(project)}
            className={`bg-white p-3 rounded-md shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all mb-2 ${isDragging ? 'opacity-50' : 'opacity-100'}`}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-semibold text-gray-800 line-clamp-2" title={project.name}>
                    {project.name || 'Projet sans nom'}
                </h4>
                <span className={`w-2 h-2 rounded-full ${project.priority ? 'bg-yellow-400' : 'bg-transparent border border-gray-300'}`} />
            </div>

            <div className="text-xs text-gray-500 mb-2">
                <p className="line-clamp-1">{project.description || project.commercialName || "Pas de description"}</p>
                <p className="mt-1 font-medium text-gray-700">{project.clientName || `${project.firstName || ''} ${project.name || ''}`.trim()}</p>
                {project.city && <p className="text-xs mt-0.5 text-gray-400">{project.city} {project.zip}</p>}
            </div>

            <div className="flex justify-between items-center mt-3">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={12} />
                    <span>{project.deadline ? format(new Date(project.deadline), 'dd/MM', { locale: fr }) : '48:00'}</span>
                </div>
                <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[10px] bg-green-100 text-green-700">
                        {project.assignedUser ? project.assignedUser.substring(0, 2).toUpperCase() : 'NA'}
                    </AvatarFallback>
                </Avatar>
            </div>
        </div>
    );
};

// 2. KANBAN COLUMN
const Column = ({ title, projects, onDropProject, onCardClick, count }) => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: 'PROJECT_CARD',
        drop: (item) => onDropProject(item.id, title),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    }));

    const ref = React.useRef(null);
    drop(ref);

    return (
        <div
            ref={ref}
            className={`flex-shrink-0 w-72 flex flex-col h-full rounded-lg mr-4 transition-colors ${isOver ? 'bg-gray-100' : 'bg-gray-50/50'}`}
        >
            <div className="p-2 flex justify-between items-center border-b border-gray-100 bg-white rounded-t-lg sticky top-0 z-10">
                <h3 className="font-semibold text-gray-700 text-sm truncate" title={title}>{title}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">{count}</span>
                    <Plus size={16} className="text-gray-400 cursor-pointer hover:text-gray-600" />
                </div>
            </div>
            <div className="p-2 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                {/* Progress Bar Mockup */}
                {count > 0 && (
                    <div className="h-1 w-full bg-gray-200 rounded-full mb-3 overflow-hidden">
                        <div className="h-full bg-teal-500" style={{ width: '40%' }}></div>
                    </div>
                )}
                {projects.map(p => (
                    <DraggableCard key={p.id} project={p} onClick={onCardClick} />
                ))}
            </div>
        </div>
    );
};

// 3. PROJECT DETAIL VIEW
const ProjectDetail = ({ project, onBack, onUpdate }) => {
    const { user } = useAuth();
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = React.useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [project.odooChat]);

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;
        const msg = {
            id: Date.now(),
            author: user?.firstName || "Utilisateur",
            content: newMessage,
            date: new Date().toISOString()
        };
        const updatedChat = [...(project.odooChat || []), msg];
        onUpdate(project.id, { odooChat: updatedChat });
        setNewMessage("");
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header / Breadcrumbs */}
            <div className="border-b px-4 py-2 flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span onClick={onBack} className="cursor-pointer hover:underline text-purple-700">Mes tâches</span>
                    <span>/</span>
                    <span className="font-semibold text-gray-900">{project.name || 'Projet'}</span>
                </div>
                <div className="flex gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs border ${project.odooStage === STAGES[0] ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>
                        {project.odooStage || STAGES[0]}
                    </span>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Content (Form) */}
                <div className="flex-1 overflow-y-auto p-6 border-r border-gray-200">
                    <div className="flex justify-between items-start mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">{String(project.id).substring(0, 8)}... - {project.clientName || `${project.firstName || ''} ${project.name || ''}`}</h1>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">Stand By</Button>
                            <Button variant="outline" size="sm">A assigner</Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 text-sm">
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="font-semibold text-gray-600">Description</label>
                                <span className="col-span-2">{project.description || "Installation PV Admin"}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="font-semibold text-gray-600">Chef de projet</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Avatar className="w-5 h-5"><AvatarFallback>CDP</AvatarFallback></Avatar>
                                    <span className="text-purple-700 font-medium">{project.assignedUser || 'Non assigné'}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="font-semibold text-gray-600">Site</label>
                                <div className="col-span-2">
                                    {project.city && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">{project.city}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="font-semibold text-gray-600">Client facturé</label>
                                <span className="col-span-2 font-medium text-blue-700">{project.firstName} {project.name}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="font-semibold text-gray-600">Email</label>
                                <span className="col-span-2 text-gray-500">{project.email || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="font-semibold text-gray-600">Téléphone</label>
                                <span className="col-span-2 text-gray-500">{project.phone || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tabs mockup */}
                    <div className="mt-8 border-b border-gray-200">
                        <div className="flex gap-6">
                            <button className="px-1 py-2 border-b-2 border-teal-600 text-teal-700 font-medium">Tâches</button>
                            <button className="px-1 py-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700">Visite Technique</button>
                            <button className="px-1 py-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700">Installation</button>
                        </div>
                    </div>
                </div>

                {/* Chatter (Sidebar) */}
                <div className="w-[400px] bg-gray-50 flex flex-col border-l border-gray-200 shrink-0">
                    <div className="p-2 border-b flex gap-2 justify-end shrink-0">
                        <Button variant="ghost" size="sm">Activités</Button>
                        <Button variant="ghost" size="sm">Note</Button>
                        <Button size="sm" className="bg-purple-700 text-white hover:bg-purple-800">Envoyer message</Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {(project.odooChat || []).map((msg, i) => (
                            <div key={i} className="flex gap-3">
                                <Avatar className="w-8 h-8 mt-1"><AvatarFallback>{msg.author ? msg.author.charAt(0) : '?'}</AvatarFallback></Avatar>
                                <div className="bg-white p-3 rounded-lg shadow-sm w-full border border-gray-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-gray-800 text-sm">{msg.author}</span>
                                        <span className="text-xs text-gray-400">{format(new Date(msg.date), 'dd MMM yyyy, HH:mm', { locale: fr })}</span>
                                    </div>
                                    <p className="text-sm text-gray-600">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 bg-white border-t shrink-0">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Écrire un message..."
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            />
                            <Button size="icon" onClick={handleSendMessage}><Send size={16} /></Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- MAIN PAGE ---
export default function Odoo() {
    const { projects, setProjects } = useProjects();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);

    const filteredProjects = useMemo(() => {
        let list = projects || [];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p =>
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.firstName && p.firstName.toLowerCase().includes(q)) ||
                (p.zip && p.zip.includes(q))
            );
        }
        return list;
    }, [projects, searchQuery]);

    // Sync selectedProject with projects list updates
    useEffect(() => {
        if (selectedProject && projects) {
            const fresh = projects.find(p => p.id === selectedProject.id);
            if (fresh && JSON.stringify(fresh) !== JSON.stringify(selectedProject)) {
                setSelectedProject(fresh);
            }
        }
    }, [projects, selectedProject]);


    const updateProjectList = (updatedProject) => {
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    };

    const saveToApi = async (id, patch) => {
        try {
            await apiService.updateProject(id, patch);
        } catch (err) {
            console.error("Failed to update project via Odoo view", err);
        }
    };

    const handleDropProject = (projectId, newStage) => {
        // Find project
        const project = projects.find(p => p.id === projectId);
        if (!project) return;
        if (project.odooStage === newStage) return;

        const updated = { ...project, odooStage: newStage };

        // Optimistic Update
        updateProjectList(updated);

        // API Call
        saveToApi(projectId, { odooStage: newStage });
    };

    const handleUpdateDetail = (id, patch) => {
        const project = projects.find(p => p.id === id);
        if (!project) return;

        const updated = { ...project, ...patch };
        updateProjectList(updated);
        saveToApi(id, patch);
    };

    if (selectedProject) {
        return (
            <ProjectDetail
                project={selectedProject}
                onBack={() => setSelectedProject(null)}
                onUpdate={handleUpdateDetail}
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-100 overflow-hidden">
            {/* Header */}
            <div className="h-14 bg-white border-b flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-800">Tâches</h1>
                    <Button variant="secondary" size="sm" className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                        <Plus size={16} className="mr-1" /> Nouveau
                    </Button>
                </div>

                <div className="flex items-center gap-2 flex-1 max-w-xl mx-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                        className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 text-gray-500">
                    <Button variant="ghost" size="icon"><Activity size={20} /></Button>
                    <Avatar className="w-8 h-8"><AvatarFallback>MO</AvatarFallback></Avatar>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
                <div className="flex h-full">
                    {STAGES.map(stage => {
                        const stageProjects = filteredProjects.filter(p => (p.odooStage || STAGES[0]) === stage);
                        return (
                            <Column
                                key={stage}
                                title={stage}
                                projects={stageProjects}
                                count={stageProjects.length}
                                onDropProject={handleDropProject}
                                onCardClick={setSelectedProject}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
