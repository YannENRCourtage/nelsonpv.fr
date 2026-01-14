import React, { useState, useMemo, useEffect } from 'react';
import { useProjects } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Search, Clock, Plus, Send, User, ChevronDown, ExternalLink } from 'lucide-react';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { LayoutGrid, List as ListIcon, Trash2, ArrowLeft, ArrowRight, MoreHorizontal, MapPin } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { useSearchParams, useNavigate } from 'react-router-dom';

import ContactModal from '@/components/crm/ContactModal.jsx';
import UserAvatar from '@/components/UserAvatar.jsx';

// --- CONSTANTS ---
const DEFAULT_STAGES = [
    "Réaliser la DP/PC",
    "Récupérer l'ARE",
    "Récupérer l'accord ou refus Mairie",
    "Déposer la demande sur le portail ENEDIS",
    "Récupérer l'accord ou refus ENEDIS",
    "Mandater l'huissier",
    "Mandater le Géomètre",
    "Mandater le Notaire"
];

// Define colors for stages
const STAGE_COLORS = {
    "Réaliser la DP/PC": "bg-blue-100 text-blue-800 border-blue-200",
    "Récupérer l'ARE": "bg-indigo-100 text-indigo-800 border-indigo-200",
    "Récupérer l'accord ou refus Mairie": "bg-purple-100 text-purple-800 border-purple-200",
    "Déposer la demande sur le portail ENEDIS": "bg-green-100 text-green-800 border-green-200",
    "Récupérer l'accord ou refus ENEDIS": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Mandater l'huissier": "bg-orange-100 text-orange-800 border-orange-200",
    "Mandater le Géomètre": "bg-amber-100 text-amber-800 border-amber-200",
    "Mandater le Notaire": "bg-red-100 text-red-800 border-red-200"
};

const EXCLUDED_PROJECTS = [
    "Projet sans nom",
    "PLANTE",
    "LECONTE", // Double entries mentioned by user
    "RECKINGER",
    "PARC ANIMALIER D'ECOUVES",
    "DURIEUX PEYRON",
    "DUCAM",
    "MARTINEZ"
];

// --- COMPONENTS ---

// 1. KANBAN CARD
const DraggableCard = ({ project, onClick, getUserName, className }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'PROJECT_CARD',
        item: { id: project.id },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    const ref = React.useRef(null);
    drag(ref);

    const createdByRaw = project.createdBy || 'Yann';
    const effectiveUserIdentifier = project.assignedUser || project.assignedTo || createdByRaw;
    const displayUser = getUserName ? getUserName(effectiveUserIdentifier) : { name: effectiveUserIdentifier, photoURL: null };

    return (
        <div
            ref={ref}
            onClick={() => onClick(project)}
            className={`bg-white p-3 rounded-md shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all ${className || 'mb-2 h-max'} ${isDragging ? 'opacity-50' : 'opacity-100'}`}
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
                    <span>
                        {project.timeLimitValue
                            ? `${project.timeLimitValue} ${project.timeLimitUnit || 'Jours'}`
                            : (project.deadline ? format(new Date(project.deadline), 'dd/MM', { locale: fr }) : '--:--')
                        }
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-gray-600">
                        {displayUser.name}
                    </span>
                    <UserAvatar
                        name={displayUser.name}
                        photoURL={displayUser.photoURL}
                        showName={false}
                        size="w-6 h-6"
                        textSize="text-[10px]"
                    />
                </div>
            </div>
        </div>
    );
};

// 2. KANBAN COLUMN
const Column = ({ title, colorClass, projects, onDropProject, onCardClick, count, getUserName, onRename, viewMode, width, onResize }) => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: "PROJECT_CARD",
        drop: (item) => onDropProject(item.id, title),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }));

    const ref = React.useRef(null);
    drop(ref);

    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(title);

    useEffect(() => {
        setEditValue(title);
    }, [title]);

    const handleStartEdit = () => {
        setIsEditing(true);
    };

    const handleCommitEdit = () => {
        setIsEditing(false);
        if (onRename && editValue !== title) {
            onRename(title, editValue);
        } else {
            setEditValue(title);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCommitEdit();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditValue(title);
        }
    };

    // Responsive Classes based on viewMode
    const containerClasses = viewMode === 'list'
        ? "flex flex-row items-stretch rounded-xl transition-colors duration-200 w-full mb-4 min-h-[160px]"
        : "flex flex-col rounded-xl transition-colors duration-200 h-full backdrop-blur-sm select-none flex-1 min-w-[200px]";

    const headerClasses = viewMode === 'list'
        ? `p-4 flex flex-col justify-center items-start border-r border-white/50 rounded-l-xl w-60 shrink-0 ${colorClass}`
        : `p-3 flex justify-between items-center border-b border-white/50 rounded-t-lg sticky top-0 z-10 ${colorClass}`;

    const contentClasses = viewMode === 'list'
        ? "p-3 flex-1 flex flex-row items-center gap-3 overflow-x-auto min-w-0 custom-scrollbar-horizontal"
        : "p-2 flex-1 overflow-y-auto min-h-0 custom-scrollbar";

    const bgClass = isOver ? "bg-purple-50/50 ring-2 ring-purple-400 ring-inset" : "bg-gray-50/50";

    return (
        <div ref={ref} className={`${containerClasses} ${bgClass}`}>
            <div className={`${headerClasses} relative group`}>
                <div className={`flex ${viewMode === 'list' ? 'flex-col gap-2 w-full' : 'justify-between w-full items-center'}`}>
                    {isEditing ? (
                        <input
                            autoFocus
                            className="font-semibold text-sm bg-white/80 border border-black/10 rounded px-1.5 py-0.5 w-full text-black focus:outline-none focus:ring-1 focus:ring-black/20"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCommitEdit}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <h3
                            className="font-semibold text-sm whitespace-normal break-words cursor-pointer hover:underline hover:opacity-80 transition-opacity"
                            title="Cliquer pour modifier"
                            onClick={handleStartEdit}
                        >
                            {title}
                        </h3>
                    )}
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs font-bold bg-white/50 px-2 py-0.5 rounded-full">{count}</span>
                    </div>
                </div>
            </div>
            <div className={contentClasses}>
                {projects.map(p => (
                    <DraggableCard
                        key={p.id}
                        project={p}
                        onClick={onCardClick}
                        getUserName={getUserName}
                        className={viewMode === 'list' ? 'w-[280px] shrink-0 h-full mb-0' : 'w-full mb-2'}
                    />
                ))}
                {projects.length === 0 && viewMode === 'list' && (
                    <div className="text-gray-400 text-sm italic pl-2">Aucun projet</div>
                )}
            </div>
        </div>
    );
};

// 3. TASK TAB COMPONENT
const STANDARD_TASKS = [
    "Vérifier la toiture",
    "Confirmer le rendez-vous client",
    "Commander le matériel",
    "Envoyer le dossier Mairie",
    "Relancer ENEDIS",
    "Préparer le chantier",
    "Installer les panneaux",
    "Raccorder l'onduleur",
    "Vérifier la mise à la terre"
];

const TEAM_MEMBERS = [
    "Yann",
    "Elodie",
    "Nico",
    "Jack",
    "Véronique",
    "Aurélien",
    "NicolasNMD",
    "Laurent"
];

const TaskTab = ({ project, activeTab, onUpdate, user }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newTask, setNewTask] = useState({ name: "", comment: "", assignedTo: "" });

    // Filter tasks for current tab (Since we removed other tabs, show ALL or just generic Tasks)
    const tasks = (project.odooTasks || []).filter(t => t.type === 'Tâches' || !t.type);

    const handleAddTask = () => {
        if (!newTask.name) return;

        const task = {
            id: Date.now(),
            type: "Tâches",
            name: newTask.name,
            comment: newTask.comment,
            assignedTo: newTask.assignedTo,
            createdBy: user?.displayName || "Utilisateur",
            createdAt: new Date().toISOString(),
            status: "pending"
        };

        const updatedTasks = [...(project.odooTasks || []), task];
        onUpdate(project.id, { odooTasks: updatedTasks });

        setIsAdding(false);
        setNewTask({ name: "", comment: "", assignedTo: "" });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-700">Liste des tâches</h3>
                <Button onClick={() => setIsAdding(!isAdding)} size="sm" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                    {isAdding ? "Annuler" : "+ Ajouter"}
                </Button>
            </div>

            {isAdding && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 mb-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Action</label>
                            <select
                                className="w-full text-sm border-gray-300 rounded-md p-2 h-9"
                                value={newTask.name}
                                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                            >
                                <option value="">Sélectionner une action...</option>
                                {STANDARD_TASKS.map(t => <option key={t} value={t}>{t}</option>)}
                                <option value="Autre">Autre (Saisie libre)</option>
                            </select>
                            {newTask.name === "Autre" && (
                                <Input
                                    className="mt-2"
                                    placeholder="Nom de l'action"
                                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                                />
                            )}
                        </div>
                        <div className="w-1/3">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Assigner à</label>
                            <Select
                                value={newTask.assignedTo}
                                onValueChange={(val) => setNewTask({ ...newTask, assignedTo: val })}
                            >
                                <SelectTrigger className="w-full bg-white border-gray-300 h-9">
                                    <SelectValue placeholder="Utilisateur" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TEAM_MEMBERS.map(member => (
                                        <SelectItem key={member} value={member}>{member}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Commentaire</label>
                        <textarea
                            className="w-full text-sm border-gray-300 rounded-md p-2 h-20 resize-none"
                            placeholder="Détails supplémentaires..."
                            value={newTask.comment}
                            onChange={(e) => setNewTask({ ...newTask, comment: e.target.value })}
                        />
                    </div>

                    <Button onClick={handleAddTask} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                        Valider la tâche
                    </Button>
                </div>
            )}

            <div className="space-y-3">
                {tasks.length === 0 && !isAdding && (
                    <div className="p-8 border-2 border-dashed border-gray-100 rounded-lg text-center text-gray-400">
                        Aucune tâche
                    </div>
                )}
                {tasks.map(task => (
                    <div key={task.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-start">
                        <div>
                            <div className="font-medium text-gray-800">{task.name}</div>
                            {task.comment && <div className="text-sm text-gray-500 mt-1">{task.comment}</div>}
                            <div className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                                <UserAvatar name={task.createdBy} size="w-4 h-4" textSize="text-[8px]" showName={false} />
                                <span>Par {task.createdBy}</span>
                                <span>•</span>
                                <span>{format(new Date(task.createdAt), 'dd MMM yyyy', { locale: fr })}</span>
                            </div>
                        </div>
                        {task.assignedTo && (
                            <div className="flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-full font-medium border border-purple-100">
                                <UserAvatar name={task.assignedTo} size="w-4 h-4" textSize="text-[8px]" showName={false} />
                                {task.assignedTo}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// 4. PROJECT DETAIL VIEW
const ProjectDetail = ({ project, onBack, onUpdate, stages, resolveUser }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = React.useRef(null);
    const [activeTab, setActiveTab] = useState("Tâches");

    // Activity / Chat
    const [showContactModal, setShowContactModal] = useState(false);

    // Helpers for Edit Customer
    const [editingContact, setEditingContact] = useState(null);
    const handleEditClient = () => {
        // Mock contact object from project data
        setEditingContact({
            id: project.id, // Using project ID as proxy for now if no dedicated contact ID
            name: project.clientName || `${project.firstName || ''} ${project.name || ''}`.trim(),
            email: project.email,
            phone: project.phone,
            company: project.company,
            city: project.city,
            status: "Client"
        });
        setShowContactModal(true);
    };

    const handleSaveContact = (updatedContact) => {
        // Sync back to project
        onUpdate(project.id, {
            clientName: updatedContact.name,
            firstName: updatedContact.name.split(' ')[0],
            name: updatedContact.name.split(' ').slice(1).join(' '),
            email: updatedContact.email,
            phone: updatedContact.phone,
            city: updatedContact.city
        });

        setShowContactModal(false);
    };

    const handleDeleteProject = async () => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce projet ?")) {
            // Assuming onDelete is passed or we handle via update
            // Ideally call apiService.deleteProject(project.id) then onBack/reload
            // For now, let's assume parent handles delete if we had an onDelete prop, 
            // but since we don't, we'll just try to hide it or implement delete later.
            // USER REQUEST 13/01/2026: "Ajoute un bouton Supprimer". Logic might be TBD.
            // Let's try calling apiService directly if possible or just log for now?
            // "Odoo.jsx" lines 300+ don't show onDelete prop.
            // I will just add the button for UI as requested.
            // Update: I will try to call an `onDelete` prop if it existed, or just alert.
            // Actually, I'll add the button and if confirmed, try to delete via API and close.
            try {
                await apiService.deleteProject(project.id);
                onBack();
                window.location.reload(); // Simple refresh for now to update list
            } catch (e) {
                console.error("Delete failed", e);
                alert("Erreur lors de la suppression");
            }
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [project.odooChat]);

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;

        const authorName = user?.firstName ? `${user.firstName} ${user.name || ''}`.trim() : (user?.displayName || "Utilisateur");

        const msg = {
            id: Date.now(),
            author: authorName,
            uid: user?.uid, // Add UID for accurate identification
            content: newMessage,
            date: new Date().toISOString(),
            type: 'message'
        };
        const updatedChat = [...(project.odooChat || []), msg];
        onUpdate(project.id, { odooChat: updatedChat });
        setNewMessage("");
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            <ContactModal
                show={showContactModal}
                onClose={() => setShowContactModal(false)}
                editingContact={editingContact}
                setEditingContact={setEditingContact}
                onSave={handleSaveContact}
            />

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
                        <ExternalLink size={12} className="mr-1" /> Ouvrir le projet
                    </Button>
                </div>
                <div className="flex items-center gap-4">
                    <Select
                        value={project.odooStage || stages[0]}
                        onValueChange={(val) => onUpdate(project.id, { odooStage: val })}
                    >
                        <SelectTrigger className="w-[280px] h-8 text-xs font-medium bg-gray-50 border-gray-300">
                            <SelectValue placeholder="Sélectionner une étape" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {stages.map(stage => (
                                <SelectItem key={stage} value={stage} className="text-xs">
                                    {stage}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div >

            <div className="flex flex-1 overflow-hidden">
                {/* Main Content (Form) */}
                <div className="flex-1 overflow-y-auto bg-white min-w-0">
                    <div className="p-8 pb-20">
                        <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-5">
                            <div className="flex items-center gap-4 w-full">
                                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                    {project.clientName || `${project.firstName || ''} ${project.name || ''}`.trim()}
                                    <span className="text-gray-400 font-normal text-lg">#{String(project.id).substring(5, 13)}...</span>
                                </h1>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="ml-4 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors h-8 w-8"
                                    onClick={handleDeleteProject}
                                    title="Supprimer le projet"
                                >
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                        </div>

                        {/* Client Info (Top Left) */}
                        <div className="bg-purple-50/60 rounded-xl p-5 mb-8 border border-purple-100">
                            <div className="flex items-center gap-2 mb-4">
                                <UserAvatar name="Client" size="w-5 h-5" className="bg-purple-200 text-purple-700" showName={false} />
                                <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wider">Client</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-8">
                                <div
                                    className="font-medium text-lg text-purple-700 flex items-center gap-2 cursor-pointer hover:underline"
                                    onClick={handleEditClient}
                                >
                                    {project.clientName || `${project.firstName} ${project.name}`}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-gray-500 uppercase mb-1">Email</span>
                                    <span className="text-gray-900 hover:text-purple-700 cursor-pointer">{project.email || '-'}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-gray-500 uppercase mb-1">Téléphone</span>
                                    <span className="text-gray-900">{project.phone || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Project Fields Grid */}
                        <div className="grid grid-cols-12 gap-6 mb-12">
                            <div className="col-span-4 space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                                <div className="font-medium text-gray-900">{project.type || "Installation PV"}</div>
                            </div>

                            <div className="col-span-4 space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 uppercase">Adresse</label>
                                <div className="text-gray-900 text-sm leading-snug">
                                    {project.address}<br />
                                    {project.zip} {project.city}
                                </div>
                            </div>

                            <div className="col-span-4 space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 uppercase">GPS</label>
                                <div className="text-gray-900 text-sm flex items-center gap-1.5">
                                    <MapPin size={14} className="text-gray-400" />
                                    {project.gps || (project.lat && project.lng ? `${project.lat}, ${project.lng}` : '-')}
                                </div>
                            </div>

                            <div className="col-span-4 space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 uppercase">Commercial</label>
                                <div className="flex items-center gap-2">
                                    <UserAvatar
                                        name={resolveUser(project.createdBy).name}
                                        photoURL={resolveUser(project.createdBy).photoURL}
                                        size="w-6 h-6"
                                        textSize="text-xs"
                                        showName={false}
                                    />
                                    <span className="text-sm text-gray-900">{resolveUser(project.createdBy).name}</span>
                                </div>
                            </div>

                            <div className="col-span-4 space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 uppercase">Chef de projet</label>
                                <Select
                                    value={project.assignedUser || ''}
                                    onValueChange={(val) => onUpdate(project.id, { assignedUser: val })}
                                >
                                    <SelectTrigger className="h-8 w-full bg-white border-gray-200">
                                        <div className="flex items-center gap-2 text-sm">
                                            {project.assignedUser && <UserAvatar name={project.assignedUser} size="w-4 h-4" textSize="text-[9px]" showName={false} />}
                                            <span className="truncate">{project.assignedUser || "Assigner"}</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TEAM_MEMBERS.map(m => (
                                            <SelectItem key={m} value={m}>
                                                <div className="flex items-center gap-2">
                                                    <UserAvatar name={m} size="w-4 h-4" textSize="text-[9px]" showName={false} />
                                                    {m}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-4 space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 uppercase">Délai</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        className="h-8 text-sm bg-white border-gray-200"
                                        placeholder="0"
                                        value={project.timeLimitValue || ''}
                                        onChange={(e) => onUpdate(project.id, { timeLimitValue: e.target.value })}
                                    />
                                    <Select
                                        value={project.timeLimitUnit || 'Jours'}
                                        onValueChange={(val) => onUpdate(project.id, { timeLimitUnit: val })}
                                    >
                                        <SelectTrigger className="h-8 w-[100px] bg-white border-gray-200 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Jours">
                                                {project.timeLimitValue == 1 ? 'Jour' : 'Jours'}
                                            </SelectItem>
                                            <SelectItem value="Heures">
                                                {project.timeLimitValue == 1 ? 'Heure' : 'Heures'}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="col-span-12 mt-2 space-y-2">
                                <label className="text-xs font-medium text-gray-500 uppercase">Commentaires</label>
                                <Textarea
                                    className="min-h-[80px] text-sm bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                    placeholder="Ajouter une note..."
                                    value={project.comment || ''}
                                    onChange={e => onUpdate(project.id, { comment: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="border-t border-gray-100 pt-6">
                            <div className="flex gap-8 border-b border-gray-200 mb-6">
                                {["Tâches", "Activités"].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {activeTab === "Tâches" && (
                                <TaskTab
                                    project={project}
                                    activeTab={activeTab}
                                    onUpdate={onUpdate}
                                    user={user}
                                />
                            )}
                            {activeTab === "Activités" && (
                                <div className="space-y-4">
                                    {(project.odooChat || []).map((msg, i) => {
                                        const isMe = (user?.uid && msg.uid === user.uid) || msg.author === "Moi" || (user && msg.author === (user.firstName ? `${user.firstName} ${user.name || ''}`.trim() : user.displayName));

                                        const handleDeleteMessage = async (msgId) => {
                                            if (!window.confirm("Supprimer ce message ?")) return;
                                            const updatedChat = (project.odooChat || []).filter(m => m.id !== msgId);
                                            onUpdate(project.id, { odooChat: updatedChat });
                                        };

                                        return (
                                            <div key={i} className={`flex gap-4 group ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <UserAvatar
                                                    name={isMe ? (user?.displayName || 'Moi') : msg.author}
                                                    photoURL={isMe ? user?.photoURL : null}
                                                    size="w-10 h-10" textSize="text-sm"
                                                />
                                                <div className={`flex-1 space-y-1 ${isMe ? 'text-right' : ''}`}>
                                                    <div className={`flex items-baseline gap-2 ${isMe ? 'flex-row-reverse' : 'justify-between'}`}>
                                                        <span className="font-semibold text-gray-900 text-sm">{msg.author}</span>
                                                        <span className="text-xs text-gray-400">
                                                            {format(new Date(msg.date), 'dd MMM yyyy, HH:mm', { locale: fr })}
                                                        </span>
                                                        {(isMe || user?.role === 'admin') && (
                                                            <button
                                                                onClick={() => handleDeleteMessage(msg.id)}
                                                                className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Supprimer"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className={`p-3.5 rounded-2xl shadow-sm border text-sm leading-relaxed inline-block text-left ${isMe
                                                        ? 'bg-blue-600 text-white rounded-tr-none border-blue-600'
                                                        : 'bg-white rounded-tl-none border-gray-100 text-gray-700'
                                                        }`}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!project.odooChat || project.odooChat.length === 0) && (
                                        <div className="text-gray-400 text-center py-8">Aucune activité récente.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar (Right) */}
                <div className="w-[450px] bg-gray-50 border-l border-gray-200 flex flex-col shrink-0 h-full">
                    <div className="p-3 border-b border-gray-200 flex gap-2 justify-end shrink-0 bg-white/50">
                        <Button size="sm" className="bg-purple-700 hover:bg-purple-800 text-white shadow-sm">Envoyer message</Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                        {(project.odooChat || []).map((msg, i) => {
                            const isMe = (user?.uid && msg.uid === user.uid) || msg.author === "Moi" || (user && msg.author === (user.firstName ? `${user.firstName} ${user.name || ''}`.trim() : user.displayName));
                            return (
                                <div key={i} className={`flex gap-4 group ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <UserAvatar
                                        name={isMe ? (user?.displayName || 'Moi') : msg.author}
                                        photoURL={isMe ? user?.photoURL : null}
                                        size="w-8 h-8" textSize="text-xs" showName={false}
                                    />
                                    <div className={`flex-1 space-y-1 ${isMe ? 'text-right' : ''}`}>
                                        <div className={`flex items-baseline gap-2 ${isMe ? 'flex-row-reverse' : 'justify-between'}`}>
                                            <span className="font-semibold text-gray-900 text-sm">{msg.author}</span>
                                            <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {format(new Date(msg.date), 'dd MMM yyyy, HH:mm', { locale: fr })}
                                            </span>
                                        </div>
                                        <div className={`p-3 rounded-2xl shadow-sm border text-sm leading-relaxed inline-block text-left ${isMe
                                            ? 'bg-blue-600 text-white rounded-tr-none border-blue-600'
                                            : 'bg-white rounded-tl-none border-gray-100 text-gray-700'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 bg-white border-t border-gray-200 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10">
                        <div className="flex gap-3">
                            <UserAvatar name={user?.displayName || "Moi"} photoURL={user?.photoURL} size="w-9 h-9" textSize="text-xs" showName={false} />
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
        </div>

    );
};


// --- NEW PROJECT DIALOG ---
const NewProjectDialog = ({ onClose, onAddProject, projects, stages }) => {
    const [search, setSearch] = useState("");
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedStage, setSelectedStage] = useState(stages[0]);

    // Show all projects here, even excluded ones, but ensure we match against multiple fields
    // RELAXED FILTER: Check if name, client, city, zip matches. 
    // And ensure we don't filter out projects that might have 'odooStage' set to null/undefined explicitly.
    const filtered = projects.filter(p => {
        const query = search.toLowerCase();
        const name = (p.name || '').toLowerCase();
        const client = (p.clientName || '').toLowerCase();
        // Also search in formatted title components
        const city = (p.city || '').toLowerCase();

        const matches = name.includes(query) || client.includes(query) || city.includes(query);
        const notInOdoo = !p.odooStage;
        return matches && notInOdoo;
    });

    const handleConfirm = () => {
        if (selectedProject && selectedStage) {
            onAddProject(selectedProject.id, selectedStage);
            onClose();
        }
    };

    return (
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Ajouter un dossier au tableau</DialogTitle>
                <DialogDescription>
                    Recherchez un projet existant pour l'ajouter à une étape du tableau Odoo.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Rechercher un projet</label>
                    <Input
                        placeholder="Nom, Client..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {search && (
                    <div className="border rounded-md max-h-[200px] overflow-y-auto">
                        {filtered.map(p => (
                            <div
                                key={p.id}
                                className={`p-2 text-sm cursor-pointer hover:bg-gray-50 flex justify-between items-center ${selectedProject?.id === p.id ? 'bg-purple-50 border-purple-200' : ''}`}
                                onClick={() => setSelectedProject(p)}
                            >
                                <span className="font-medium">{p.name || "Projet sans nom"}</span>
                                <span className="text-xs text-gray-500">{p.clientName}</span>
                            </div>
                        ))}
                        {filtered.length === 0 && <div className="p-2 text-sm text-gray-400">Aucun projet trouvé</div>}
                    </div>
                )}

                {selectedProject && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Sélectionner une étape</label>
                        <Select value={selectedStage} onValueChange={setSelectedStage}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {stages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Annuler</Button>
                <Button onClick={handleConfirm} disabled={!selectedProject}>Ajouter le dossier</Button>
            </div>
        </DialogContent>
    );
};

// --- MAIN PAGE ---
export default function Odoo() {
    const { projects, setProjects } = useProjects();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAssigned, setFilterAssigned] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    // Stages State (Persisted)
    const [stages, setStages] = useState(() => {
        const saved = localStorage.getItem('odoo_stages');
        return saved ? JSON.parse(saved) : DEFAULT_STAGES;
    });

    const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
    const [newStageName, setNewStageName] = useState("");
    const [isAddingStage, setIsAddingStage] = useState(false);

    // Save Stages
    useEffect(() => {
        localStorage.setItem('odoo_stages', JSON.stringify(stages));
    }, [stages]);

    // Users Map for ID -> Name/Photo Resolution
    const [usersMap, setUsersMap] = useState({}); // UID -> { name, photoURL }
    const [nameMap, setNameMap] = useState({});   // Name -> { name, photoURL }

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const users = await apiService.getUsers();
                const uMap = {};
                const nMap = {};
                users.forEach(u => {
                    const firstName = u.firstName || (u.displayName || '').split(' ')[0] || 'Utilisateur';
                    const fullObj = {
                        name: firstName,
                        photoURL: u.photoURL,
                        fullName: u.displayName || firstName
                    };
                    uMap[u.uid] = fullObj;
                    uMap[u.id] = fullObj; // Map ID as well

                    // Populate Name Map
                    if (u.displayName) nMap[u.displayName.toLowerCase()] = fullObj;
                    if (u.firstName) nMap[u.firstName.toLowerCase()] = fullObj;

                    // Specific Aliases / Logic
                    if (u.firstName === 'Véronique' || (u.displayName && u.displayName.includes('Véronique'))) {
                        nMap['véronique'] = fullObj;
                        nMap['vero'] = fullObj;
                    }
                    if (u.firstName === 'Nicolas' || u.displayName === 'Nicolas DESAINT') {
                        nMap['nico'] = fullObj; // Map 'nico' to Nicolas Desaint if needed? 
                        // Or if 'Nico' is a separate user check list.
                        // But usually 'Nico' refers to the creator.
                    }
                });

                // Manual overrides if needed based on known issues
                const vero = users.find(u => u.firstName === 'Véronique' || (u.displayName && u.displayName.includes('Véronique')));
                if (vero) {
                    const veroObj = { name: 'Véro', photoURL: vero.photoURL, fullName: vero.displayName };
                    nMap['véronique'] = veroObj;
                    nMap['véro'] = veroObj;
                }

                setUsersMap(uMap);
                setNameMap(nMap);
            } catch (error) {
                console.error("Failed to load users for Odoo mapping", error);
            }
        };
        loadUsers();
    }, []);

    const resolveUser = (identifier) => {
        const defaultUser = { name: 'Yann', photoURL: null };
        if (!identifier) return defaultUser;

        // 1. Try UID/ID match
        if (usersMap[identifier]) return usersMap[identifier];

        // 2. Try Name match
        const lowerId = identifier.toLowerCase();
        if (nameMap[lowerId]) return nameMap[lowerId];

        // 3. Fallback logic
        // If it looks like an ID (>20 chars) but not found -> 'Utilisateur'
        if (identifier.length > 20 && !identifier.includes(' ')) {
            // Check if we can find it via partial scan or it's a legacy ID?
            return { name: 'Utilisateur', photoURL: null };
        }

        // 4. Legacy string name
        return { name: identifier.split(' ')[0], photoURL: null };
    };

    // Derived state from URL
    const selectedProjectId = searchParams.get('project');
    const selectedProject = useMemo(() => {
        return projects?.find(p => String(p.id) === String(selectedProjectId));
    }, [projects, selectedProjectId]);

    const filteredProjects = useMemo(() => {
        let list = projects || [];

        // 1. Valid Projects Only (Default Filtering)
        list = list.filter(p => {
            // If searched, show everything matching
            if (searchQuery) return true;

            // If actively in a stage, show it
            if (p.odooStage && stages.includes(p.odooStage)) return true;

            // Check Exclusion List
            // Explicit check: if project name is in exclusion list OR matched via substring specific logic if needed
            // Using exact match on Name or "Projet sans nom" logic
            const name = p.name || "Projet sans nom";
            if (EXCLUDED_PROJECTS.some(excluded => name.includes(excluded))) return false;

            return true;
        });

        // 2. Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p =>
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.firstName && p.firstName.toLowerCase().includes(q)) ||
                (p.zip && p.zip.includes(q))
            );
        }

        // 3. Assigned Filter
        if (filterAssigned && user) {
            const userName = user.firstName || user.displayName;
            list = list.filter(p => p.assignedUser === userName || p.assignedUser === "Moi" || p.assignedUser === user.displayName);
        }

        return list;
    }, [projects, searchQuery, stages, filterAssigned, user]);


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

    const handleDropProject = async (projectId, newStage) => {
        // Optimistic UI Update
        const updatedProjects = projects.map(p =>
            p.id === projectId ? { ...p, odooStage: newStage } : p
        );
        setProjects(updatedProjects);

        try {
            await apiService.updateProject(projectId, { odooStage: newStage });
        } catch (error) {
            console.error("Failed to update project stage", error);
            // Revert on error could be implemented here
        }
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

    // Stage Management
    const moveStage = (index, direction) => {
        const newStages = [...stages];
        if (direction === 'left' && index > 0) {
            [newStages[index - 1], newStages[index]] = [newStages[index], newStages[index - 1]];
        } else if (direction === 'right' && index < stages.length - 1) {
            [newStages[index + 1], newStages[index]] = [newStages[index], newStages[index + 1]];
        }
        setStages(newStages);
    };

    const handleAddStage = () => {
        if (newStageName.trim()) {
            setStages([...stages, newStageName.trim()]);
            setNewStageName("");
            setIsAddingStage(false);
        }
    };

    const handleAddProjectToStage = (projectId, stage) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            const updated = { ...project, odooStage: stage };
            updateProjectList(updated);
            saveToApi(projectId, { odooStage: stage });
        }
    };

    // === NEW: RENAME STAGE & COLOR LOGIC ===
    const COLOR_PALETTE = [
        "bg-blue-100 text-blue-800 border-blue-200",
        "bg-indigo-100 text-indigo-800 border-indigo-200",
        "bg-purple-100 text-purple-800 border-purple-200",
        "bg-green-100 text-green-800 border-green-200",
        "bg-emerald-100 text-emerald-800 border-emerald-200",
        "bg-orange-100 text-orange-800 border-orange-200",
        "bg-amber-100 text-amber-800 border-amber-200",
        "bg-red-100 text-red-800 border-red-200",
        "bg-cyan-100 text-cyan-800 border-cyan-200",
        "bg-teal-100 text-teal-800 border-teal-200",
        "bg-lime-100 text-lime-800 border-lime-200",
        "bg-rose-100 text-rose-800 border-rose-200"
    ];

    const getStageColor = (stageName, index) => {
        if (STAGE_COLORS[stageName]) return STAGE_COLORS[stageName];
        // Dynamic assignment based on index
        return COLOR_PALETTE[index % COLOR_PALETTE.length];
    };

    const handleRenameStage = (oldName, newName) => {
        const trimmedNewName = newName.trim();
        if (!trimmedNewName || trimmedNewName === oldName) return;
        if (stages.includes(trimmedNewName)) {
            alert("Une étape avec ce nom existe déjà.");
            return;
        }

        // 1. Update Stages List
        const updatedStages = stages.map(s => s === oldName ? trimmedNewName : s);
        setStages(updatedStages);

        // 2. Update Projects in this Stage
        const projectsInStage = projects.filter(p => p.odooStage === oldName);
        projectsInStage.forEach(p => {
            const updated = { ...p, odooStage: trimmedNewName };
            // Update local state one by one
            setProjects(prev => prev.map(current => current.id === p.id ? updated : current));
            // Trigger API update
            saveToApi(p.id, { odooStage: trimmedNewName });
        });
    };

    // View Mode State: 'kanban' or 'list'
    const [viewMode, setViewMode] = useState('kanban');

    if (selectedProject) {
        return (
            <ProjectDetail
                project={selectedProject}
                onBack={handleBack}
                onUpdate={handleUpdateDetail}
                stages={stages}
                resolveUser={resolveUser}
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="h-16 bg-white border-b flex items-center px-6 justify-between shrink-0 shadow-sm z-20">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-bold text-gray-800 tracking-tight">Tableau de bord</h1>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="secondary" size="sm" className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100 font-medium">
                                        <Plus size={16} className="mr-1.5" /> Nouveau Dossier
                                    </Button>
                                </DialogTrigger>
                                <NewProjectDialog
                                    onClose={() => setIsNewProjectOpen(false)}
                                    projects={projects || []}
                                    stages={stages}
                                    onAddProject={handleAddProjectToStage}
                                />
                            </Dialog>
                        </div>
                        <Button
                            variant={filterAssigned ? "default" : "outline"}
                            size="sm"
                            className={filterAssigned ? "bg-purple-600 hover:bg-purple-700" : "text-gray-600 border-gray-300"}
                            onClick={() => setFilterAssigned(!filterAssigned)}
                        >
                            <User size={14} className="mr-1.5" /> Assignés à moi
                        </Button>
                    </div>
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
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`hover:bg-purple-50 ${viewMode === 'list' ? 'text-purple-600 bg-purple-50' : 'text-gray-400'}`}
                        onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}
                        title={viewMode === 'kanban' ? "Vue Liste" : "Vue Colonnes"}
                    >
                        {viewMode === 'kanban' ? <ListIcon size={20} /> : <LayoutGrid size={20} />}
                    </Button>
                    {/* AD Avatar Removed */}
                </div>
            </div>

            {/* Board Content */}
            <div className={`flex-1 p-6 ${viewMode === 'list' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-x-auto overflow-y-hidden'}`}>
                <div className={`${viewMode === 'list' ? 'flex flex-col pb-10 space-y-4' : 'flex h-full pb-2 gap-4 relative'}`}>
                    {stages.map((stage, index) => {
                        const stageProjects = filteredProjects.filter(p => (p.odooStage || DEFAULT_STAGES[0]) === stage);
                        const stageColor = getStageColor(stage, index);

                        return (
                            <div key={stage} className={`group relative ${viewMode === 'kanban' ? 'h-full flex-shrink-0' : ''}`}>
                                {/* Header Controls (Hover) - Only in Kanban for now or adapts? */}
                                {viewMode === 'kanban' && (
                                    <div className="absolute top-0 right-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex bg-white rounded-md shadow-sm border p-0.5">
                                        <button onClick={() => moveStage(index, 'left')} disabled={index === 0} className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ArrowLeft size={12} /></button>
                                        <button onClick={() => moveStage(index, 'right')} disabled={index === stages.length - 1} className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ArrowRight size={12} /></button>
                                    </div>
                                )}

                                <Column
                                    title={stage}
                                    colorClass={stageColor}
                                    projects={stageProjects}
                                    count={stageProjects.length}
                                    onDropProject={handleDropProject}
                                    onCardClick={handleSelectProject}
                                    getUserName={resolveUser}
                                    onRename={handleRenameStage}
                                    viewMode={viewMode}
                                />
                            </div>
                        );
                    })}

                    {/* Add Stage Column (Hidden in List Mode for now to keep it clean?) 
                        Or render as a "New Stage" row? 
                        User didn't specify. Standard is usually separate button in List.
                        Let's keep it compatible if possible, or hide it.
                    */}
                    {viewMode === 'kanban' && (
                        <div className="flex-shrink-0 w-80 h-full rounded-lg bg-gray-50/50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-purple-300 hover:bg-purple-50/50 transition-colors">
                            {isAddingStage ? (
                                <div className="p-4 w-full">
                                    <Input
                                        autoFocus
                                        placeholder="Nom de l'étape"
                                        className="mb-2 bg-white"
                                        value={newStageName}
                                        onChange={e => setNewStageName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddStage()}
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button size="sm" variant="ghost" onClick={() => setIsAddingStage(false)}>Annuler</Button>
                                        <Button size="sm" onClick={handleAddStage}>Ajouter</Button>
                                    </div>
                                </div>
                            ) : (
                                <Button variant="ghost" className="w-full h-full text-gray-400 hover:text-purple-600" onClick={() => setIsAddingStage(true)}>
                                    <span className="font-medium text-3xl">+</span>
                                </Button>
                            )}
                        </div>
                    )}
                    {viewMode === 'list' && (
                        <div className="rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center p-4 text-gray-400 hover:border-purple-300 hover:bg-purple-50/50 transition-colors cursor-pointer" onClick={() => setIsAddingStage(true)}>
                            {isAddingStage ? (
                                <div className="flex gap-2 w-full max-w-md">
                                    <Input
                                        autoFocus
                                        placeholder="Nom de la nouvelle étape"
                                        className="bg-white"
                                        value={newStageName}
                                        onChange={e => setNewStageName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddStage()}
                                    />
                                    <Button size="sm" onClick={handleAddStage}>Ajouter</Button>
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setIsAddingStage(false); }}>Annuler</Button>
                                </div>
                            ) : (
                                <span className="font-medium flex items-center gap-2"><Plus size={16} /> Ajouter une étape</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
