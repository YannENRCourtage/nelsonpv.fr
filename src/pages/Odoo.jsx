import React, { useState, useMemo, useEffect } from 'react';
import { useProjects } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Search, Clock, Plus, Activity, Send, User, ChevronDown, ExternalLink } from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { apiService } from '@/services/api';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useSearchParams, useNavigate } from 'react-router-dom';

// --- CONSTANTS ---
const STAGES = [
    "Réaliser la DP/PC",
    "Récupérer l'ARE",
    "Récupérer l'accord ou refus Mairie",
    "Déposer la demande sur le portail ENEDIS",
    "Récupérer l'accord ou refus ENEDIS",
    "Mandater l'huissier",
    "Mandater le Géomètre",
    "Mandater le Notaire"
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
                    <span>{project.deadline ? format(new Date(project.deadline), 'dd/MM', { locale: fr }) : '--:--'}</span>
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
            className={`flex-shrink-0 w-80 flex flex-col h-full rounded-lg mr-4 transition-colors ${isOver ? 'bg-gray-100' : 'bg-gray-50/50'}`}
        >
            <div className="p-3 flex justify-between items-center border-b border-gray-100 bg-white rounded-t-lg sticky top-0 z-10">
                <h3 className="font-semibold text-gray-700 text-sm truncate max-w-[200px]" title={title}>{title}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
                    <Plus size={16} className="text-gray-400 cursor-pointer hover:text-gray-600" />
                </div>
            </div>
            <div className="p-2 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                {count > 0 && (
                    <div className="h-1 w-full bg-gray-200 rounded-full mb-3 overflow-hidden">
                        <div className="h-full bg-teal-500" style={{ width: '100%' }}></div>
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
    const navigate = useNavigate();
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = React.useRef(null);
    const [activeTab, setActiveTab] = useState("Tâches");

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [project.odooChat]);

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;

        // Use current user info
        const authorName = user?.firstName ? `${user.firstName} ${user.name || ''}`.trim() : (user?.displayName || "Utilisateur");
        const authorInitial = authorName.charAt(0).toUpperCase();

        const msg = {
            id: Date.now(),
            author: authorName,
            authorInitial: authorInitial,
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
            <div className="border-b px-6 py-3 flex justify-between items-center bg-white shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span onClick={onBack} className="cursor-pointer hover:underline text-purple-700 font-medium">Mes tâches</span>
                    <span className="text-gray-400">/</span>
                    <span className="font-semibold text-gray-900">{project.name || 'Projet'}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        onClick={() => navigate(`/project/${project.id}/edit`)}
                    >
                        <ExternalLink size={12} className="mr-1" /> Ouvrir
                    </Button>
                </div>
                <div className="flex items-center gap-4">
                    <Select
                        value={project.odooStage || STAGES[0]}
                        onValueChange={(val) => onUpdate(project.id, { odooStage: val })}
                    >
                        <SelectTrigger className="w-[280px] h-8 text-xs font-medium bg-gray-50 border-gray-300">
                            <SelectValue placeholder="Sélectionner une étape" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {STAGES.map(stage => (
                                <SelectItem key={stage} value={stage} className="text-xs">
                                    {stage}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                        {project.assignedUser ? (
                            <div className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                                <Avatar className="w-5 h-5"><AvatarFallback className="text-[10px] bg-purple-200 text-purple-800">{project.assignedUser.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                                <span className="text-xs font-semibold text-purple-800">{project.assignedUser}</span>
                            </div>
                        ) : (
                            <span className="text-xs text-gray-400 italic">Non assigné</span>
                        )}
                    </div>
                </div>
            </div >

            <div className="flex flex-1 overflow-hidden">
                {/* Main Content (Form) */}
                <div className="flex-1 overflow-y-auto p-8 border-r border-gray-200 bg-white">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                {project.clientName || `${project.firstName || ''} ${project.name || ''}`.trim()}
                                <span className="text-gray-400 font-normal text-lg">#{String(project.id).substring(5, 12)}...</span>
                            </h1>

                            {/* Project Manager Display - Requested Requirement */}
                            {project.assignedUser && (
                                <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                                    <User size={14} />
                                    En charge : <span className="font-medium text-gray-700">{project.assignedUser}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="text-gray-600 border-gray-300">Stand By</Button>
                            <Button variant="outline" size="sm" className="text-gray-600 border-gray-300">A assigner</Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm">
                        <div className="space-y-5">
                            <div className="grid grid-cols-3 gap-2 items-start">
                                <label className="font-medium text-gray-500">Description</label>
                                <span className="col-span-2 text-gray-900 block">{project.description || "Installation PV"}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="font-medium text-gray-500">Chef de projet</label>
                                <div className="col-span-2">
                                    {/* Assignment Input */}
                                    <div className="relative">
                                        <Input
                                            value={project.assignedUser || ''}
                                            onChange={(e) => onUpdate(project.id, { assignedUser: e.target.value })}
                                            className="h-8 max-w-[200px]"
                                            placeholder="Assigner un utilisateur"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="font-medium text-gray-500">Site</label>
                                <div className="col-span-2">
                                    {project.city ? (
                                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium border border-blue-100 inline-flex items-center gap-1">
                                            {project.zip} {project.city}
                                        </span>
                                    ) : '-'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="font-medium text-gray-500">Client facturé</label>
                                <div className="col-span-2 font-medium text-purple-700 flex items-center gap-2 cursor-pointer hover:underline">
                                    <Avatar className="w-5 h-5"><AvatarFallback className="bg-purple-100 text-purple-700 text-[10px]">CL</AvatarFallback></Avatar>
                                    {project.firstName} {project.name}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="font-medium text-gray-500">Email</label>
                                <span className="col-span-2 text-gray-700 hover:text-purple-700 cursor-pointer">{project.email || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="font-medium text-gray-500">Téléphone</label>
                                <span className="col-span-2 text-gray-700">{project.phone || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="mt-10">
                        <div className="flex gap-8 border-b border-gray-200">
                            {["Tâches", "Visite Technique", "Installation"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <div className="py-6 text-gray-500 text-sm">
                            {/* Placeholder Content */}
                            {activeTab === 'Tâches' && (
                                <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                                    Aucune tâche définie pour ce projet.
                                </div>
                            )}
                            {activeTab === 'Visite Technique' && (
                                <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                                    Aucune visite technique programmée.
                                </div>
                            )}
                            {activeTab === 'Installation' && (
                                <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                                    Détails d'installation à venir.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Chatter (Sidebar) - Full Height */}
                <div className="w-[450px] bg-gray-50/80 flex flex-col border-l border-gray-200 shrink-0 h-full backdrop-blur-sm">
                    <div className="p-3 border-b border-gray-200 flex gap-2 justify-end shrink-0 bg-white/50">
                        <Button variant="ghost" size="sm" className="text-gray-600">Activités</Button>
                        <Button variant="ghost" size="sm" className="text-gray-600">Note</Button>
                        <Button size="sm" className="bg-purple-700 hover:bg-purple-800 text-white shadow-sm">Envoyer message</Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                        {(project.odooChat || []).map((msg, i) => (
                            <div key={i} className="flex gap-4 group">
                                <Avatar className="w-10 h-10 mt-1 shadow-sm border border-white">
                                    <AvatarFallback className="bg-gradient-to-br from-purple-100 to-blue-100 text-gray-700">
                                        {msg.authorInitial || msg.author?.charAt(0) || '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-semibold text-gray-900 text-sm">{msg.author}</span>
                                        <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {format(new Date(msg.date), 'dd MMM yyyy, HH:mm', { locale: fr })}
                                        </span>
                                    </div>
                                    <div className="bg-white p-3.5 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-sm text-gray-700 leading-relaxed">
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 bg-white border-t border-gray-200 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10">
                        <div className="flex gap-3">
                            <Avatar className="w-9 h-9">
                                <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">MOI</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 relative">
                                <Input
                                    placeholder="Écrire un commentaire..."
                                    className="pr-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-purple-300 transition-all rounded-full"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                />
                                <Button
                                    size="icon"
                                    onClick={handleSendMessage}
                                    className={`absolute right-1 top-1 w-7 h-7 rounded-full ${newMessage.trim() ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-transparent text-gray-300 hover:bg-gray-100'}`}
                                    disabled={!newMessage.trim()}
                                >
                                    <Send size={14} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};


// --- MAIN PAGE ---
export default function Odoo() {
    const { projects, setProjects } = useProjects();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();

    // Derived state from URL
    const selectedProjectId = searchParams.get('project');
    const selectedProject = useMemo(() => {
        return projects?.find(p => String(p.id) === String(selectedProjectId));
    }, [projects, selectedProjectId]);

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

    const handleSelectProject = (project) => {
        setSearchParams({ project: project.id });
    };

    const handleBack = () => {
        setSearchParams({});
    };

    if (selectedProject) {
        return (
            <ProjectDetail
                project={selectedProject}
                onBack={handleBack}
                onUpdate={handleUpdateDetail}
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="h-16 bg-white border-b flex items-center px-6 justify-between shrink-0 shadow-sm z-20">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-bold text-gray-800 tracking-tight">Tableau de bord</h1>
                    <Button variant="secondary" size="sm" className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100 font-medium">
                        <Plus size={16} className="mr-1.5" /> Nouveau
                    </Button>
                </div>

                <div className="flex items-center gap-3 flex-1 max-w-lg mx-8 relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                        className="pl-11 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all rounded-full h-10"
                        placeholder="Rechercher un projet..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 text-gray-500">
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-purple-600 hover:bg-purple-50"><Activity size={20} /></Button>
                    <div className="h-8 w-[1px] bg-gray-200 mx-1"></div>
                    <Avatar className="w-9 h-9 border border-gray-100 shadow-sm"><AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">AD</AvatarFallback></Avatar>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                <div className="flex h-full pb-2">
                    {STAGES.map(stage => {
                        const stageProjects = filteredProjects.filter(p => (p.odooStage || STAGES[0]) === stage);
                        return (
                            <Column
                                key={stage}
                                title={stage}
                                projects={stageProjects}
                                count={stageProjects.length}
                                onDropProject={handleDropProject}
                                onCardClick={handleSelectProject}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
