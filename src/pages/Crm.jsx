import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useProjects } from '@/contexts/ProjectContext.jsx';
import * as XLSX from 'xlsx';
import { generatePdfForProject } from '@/components/AppLayout.jsx';
import { apiService } from '@/services/api.js';
import { toast } from '@/components/ui/use-toast.js';
import {
  LayoutDashboard, Users, TrendingUp, CheckSquare, Calendar, FileText,
  Plus, Search, Euro, Settings, LogOut, X, Edit, Trash2, Save, Phone,
  Mail, Building, MapPin, Tag, Clock, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, BarChart3, PieChart, Activity, FolderHeart, MapPin as MapIcon, FileDown, ExternalLink,
  List, LayoutGrid, UserCircle, User, Briefcase, Calendar as CalendarIcon, Filter, MoreVertical, Shuffle, Menu, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import UserSettingsModal from '@/components/crm/UserSettingsModal.jsx';
import ContactModal from '@/components/crm/ContactModal.jsx';
import UserAvatar from '@/components/UserAvatar.jsx';
import ProjectsMap from '@/components/crm/ProjectsMap.jsx';

// UserAvatar replaced by import

// ContactModal definition moved to component

const TaskModal = ({ show, onClose, editingTask, setEditingTask, onSave, contacts }) => {
  if (!show || !editingTask) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-xl font-bold text-slate-900">Nouvelle tâche</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Titre de la tâche</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={editingTask.title}
              onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
              placeholder="Appeler le client..."
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Contact lié</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={editingTask.contact}
                onChange={(e) => setEditingTask({ ...editingTask, contact: e.target.value })}
              >
                <option value="">Sélectionner...</option>
                {contacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Date d'échéance</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={editingTask.dueDate}
                onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Priorité</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={editingTask.priority}
              onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
            >
              <option value="Basse">Basse</option>
              <option value="Moyenne">Moyenne</option>
              <option value="Haute">Haute</option>
            </select>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            onClick={onSave}
            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
          >
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
};

import TransferProjectModal from '@/components/TransferProjectModal.jsx';
import DuplicateProjectModal from '@/components/DuplicateProjectModal.jsx';


export default function Crm() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects, setProjects } = useProjects();
  const { user, activeTenantId } = useAuth();

  // États principaux
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'dashboard');

  useEffect(() => {
    if (tabFromUrl && ['dashboard', 'contacts', 'projects', 'calendar', 'reports'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  const [viewMode, setViewMode] = useState('list');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [opportunities, setOpportunities] = useState([]); // Ajout pour éviter le crash
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]); // Pour résoudre les photos utilisateurs
  const [filterUser, setFilterUser] = useState('all'); // Filtre par utilisateur
  const [filterType, setFilterType] = useState('all'); // Filtre par type
  const [filterStatus, setFilterStatus] = useState('all'); // Filtre par statut
  const [filterMyProjects, setFilterMyProjects] = useState(false); // Filtre "Mes Projets"
  const [monthlyKpis, setMonthlyKpis] = useState(null); // Store last month's KPI values
  const [isLoading, setIsLoading] = useState(true);
  const [isDedupLoading, setIsDedupLoading] = useState(false);

  // États Modales
  const [showContactModal, setShowContactModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [transferProjectData, setTransferProjectData] = useState(null);
  const [duplicateProjectData, setDuplicateProjectData] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [taskViewMode, setTaskViewMode] = useState('list');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Helper de normalisation du tenant / entreprise
  const normalizeTenant = (t, email = '') => {
    if (!t && email) {
      const em = email.toLowerCase();
      if (em.includes('acama')) return 'acama';
      return 'green-invest';
    }
    const clean = (t || '').toLowerCase().trim();
    if (clean.includes('acama')) return 'acama';
    if (clean.includes('green') || clean.includes('invest') || clean.includes('barconniere') || clean.includes('enr')) return 'green-invest';
    return clean || 'green-invest';
  };

  const currentUserTenant = normalizeTenant(user?.tenantId || activeTenantId, user?.email);

  // Utilisateurs restreints au même tenant que l'utilisateur connecté
  const tenantUsers = useMemo(() => {
    return users.filter(u => {
      const uTenant = normalizeTenant(u.tenantId || u.company, u.email);
      return uTenant === currentUserTenant;
    });
  }, [users, currentUserTenant]);

  // Charger les données initiales
  const refreshActivities = async () => {
    try {
      const latest = await apiService.getActivities(12, activeTenantId);
      setActivities(latest || []);
    } catch (err) {
      console.error("Failed to refresh activities:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [contactsData, tasksData, activitiesData, usersData] = await Promise.all([
          apiService.getContacts(activeTenantId),
          apiService.getTasks(activeTenantId),
          apiService.getActivities(12, activeTenantId),
          apiService.getUsers()
        ]);
        // CLEANUP: Filtrage initial
        const validContacts = [];
        const contactDeletions = [];
        
        // On récupère aussi les projets pour vérifier l'appartenance réelle
        const projsData = await apiService.getProjects(activeTenantId);
        
        (contactsData || []).forEach(c => {
          const hasLocalProjects = projsData.some(p => 
            (p.email && c.email && p.email.toLowerCase() === c.email.toLowerCase()) ||
            (p.name && c.name && p.name.toLowerCase() === c.name.toLowerCase()) ||
            (p.id === c.projectId)
          );

          if (c.name === 'Client sans nom' || c.name === 'Contact sans nom') {
            contactDeletions.push(apiService.deleteContact(c.id).catch(e => console.warn("Cleanup contact failed", e)));
          } else if (!hasLocalProjects) {
            // Si le contact n'a aucun projet local, on ne l'affiche pas (Isolation Tenant)
            // Note: On ne le supprime pas forcément tout de suite ici, on l'isole.
          } else {
            validContacts.push(c);
          }
        });

        // Trigger project cleanup in background (Sans nom)
        apiService.getProjects(activeTenantId).then(async (allProjs) => {
          const badProjs = allProjs.filter(p => !p.name || p.name.trim() === '' || p.name === 'Projet' || p.name === 'Sans nom' || p.name === 'PROJET SANS NOM');
          if (badProjs.length > 0) {
            console.log(`Cleaning up ${badProjs.length} unnamed projects...`);
            await Promise.all(badProjs.map(p => apiService.deleteProject(p.id).catch(e => console.warn("Cleanup project failed", e))));
          }
        }).catch(e => console.warn("Project cleanup check failed", e));

        // Auto-Deduplication silencieuse pour les admins
        if (user?.role === 'admin') {
          // On passe les données fraîches car les states ne sont pas encore mis à jour
          handleDeduplicateContacts(true, validContacts, projsData); 
        }

        setContacts(validContacts);
        setTasks(tasksData || []);
        setActivities(activitiesData || []);
        setUsers(usersData || []);

        // Load monthly KPI snapshot for comparison
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

        try {
          const snapshot = await apiService.getMonthlyKpiSnapshot(lastMonth);
          if (snapshot) {
            setMonthlyKpis(snapshot);
          }
        } catch (err) {
          console.log('No previous month snapshot found');
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({ title: "Erreur", description: "Erreur de chargement des données.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, activeTenantId]);

  // Réinitialiser la sélection au changement d'onglet
  useEffect(() => {
    setSelectedProjects([]);
    setSelectedContacts([]);
  }, [activeTab]);

  // Helpers
  const formatTime = (timestamp) => {
    if (!timestamp) return '...';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return date.toLocaleDateString();
  };

  const currentUser = {
    name: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : (user?.displayName || 'Utilisateur'),
    role: user?.title || (user?.role === 'admin' ? 'Administrateur' : ((user?.firstName?.toLowerCase().includes('laurent') && user?.lastName?.toLowerCase().includes('guyon')) ? 'Président' : 'Conseiller')),
    avatar: user?.photoURL ? user.photoURL : (user?.firstName?.[0] || user?.displayName?.[0] || 'U').toUpperCase(),
    photoURL: user?.photoURL,
    color: user?.role === 'admin' ? 'bg-indigo-600' : 'bg-blue-600'
  };

  // Calculate weekly percentage changes
  const calculateWeeklyGrowth = (currentCount, items, type) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    let previousCount = currentCount;

    if (type === 'contacts') {
      // For contacts, we assume growth is just new contacts created
      // Previous = Current - CreatedLastWeek
      const newThisWeek = items.filter(c => new Date(c.createdAt?.toDate?.() || c.createdAt || 0) > oneWeekAgo).length;
      previousCount = currentCount - newThisWeek;
    } else if (type === 'projects_in_progress') {
      // Approximation: 
      // Inflow: Projects created this week that are 'En cours' (or just created and assumed active? rarely)
      // Or better: Projects with status 'En cours' don't track when they entered that status.
      // We'll trust "Active Objects" didn't change much unless a new one was created or an old one finished.
      // Prev = Current - (CreatedThisWeek & EnCours) + (TerminatedThisWeek)
      // This is very rough. Let's just track "New Projects" as growth for the "En cours" stock is tricky.
      // Alternative: Just count how many were modified this week? No.
      // Let's go with:
      // Prev = Current - CreatedThisWeek (that are currently en cours) + CompletedThisWeek (that were likely en cours)
      const createdAndActive = items.filter(p => p.status === 'En cours' && new Date(p.createdAt?.toDate?.() || p.createdAt || 0) > oneWeekAgo).length;
      const completedRecently = items.filter(p => (p.status === 'Terminé' || p.status === 'terminé') && new Date(p.updatedAt?.toDate?.() || p.updatedAt || 0) > oneWeekAgo).length;

      previousCount = currentCount - createdAndActive + completedRecently;

    } else if (type === 'tasks_in_progress') {
      // Prev = Current - CreatedThisWeek + CompletedThisWeek
      const createdAndActive = items.filter(t => !t.completed && new Date(t.createdAt?.toDate?.() || t.createdAt || 0) > oneWeekAgo).length;
      const completedRecently = items.filter(t => t.completed && new Date(t.updatedAt?.toDate?.() || t.updatedAt || 0) > oneWeekAgo).length;
      previousCount = currentCount - createdAndActive + completedRecently;

    } else if (type === 'projects_completed') {
      // Prev = Current - CompletedThisWeek
      const completedRecently = items.filter(p => (p.status === 'Terminé' || p.status === 'terminé') && new Date(p.updatedAt?.toDate?.() || p.updatedAt || 0) > oneWeekAgo).length;
      previousCount = currentCount - completedRecently;
    }

    if (previousCount === 0) return { trend: '100%', trendPositive: true }; // Infinite growth if started from 0

    const change = ((currentCount - previousCount) / previousCount) * 100;
    return {
      trend: `${change > 0 ? '+' : ''}${Math.round(change)}%`,
      trendPositive: change >= 0
    };
  };


  const currentKpiValues = {
    contacts: contacts.length,
    projectsInProgress: projects.filter(p => p.status === 'En cours').length,
    tasksInProgress: tasks.filter(t => !t.completed).length,
    projectsCompleted: projects.filter(p => (p.status === 'terminé' || p.status === 'Terminé')).length
  };

  const kpis = [
    {
      icon: Users,
      label: 'Contacts',
      value: currentKpiValues.contacts.toString(),
      ...calculateWeeklyGrowth(currentKpiValues.contacts, contacts, 'contacts'),
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      height: 'h-32 lg:h-48'
    },
    {
      icon: FolderHeart,
      label: 'Projets en cours',
      value: currentKpiValues.projectsInProgress.toString(),
      ...calculateWeeklyGrowth(currentKpiValues.projectsInProgress, projects, 'projects_in_progress'),
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
      height: 'h-32 lg:h-48'
    },
    {
      icon: CheckSquare,
      label: 'Tâches en cours',
      value: currentKpiValues.tasksInProgress.toString(),
      ...calculateWeeklyGrowth(currentKpiValues.tasksInProgress, tasks, 'tasks_in_progress'),
      color: 'bg-orange-500',
      bgLight: 'bg-orange-50',
      height: 'h-32 lg:h-48'
    },
    {
      icon: CheckCircle2,
      label: 'Projets terminés',
      value: currentKpiValues.projectsCompleted.toString(),
      ...calculateWeeklyGrowth(currentKpiValues.projectsCompleted, projects, 'projects_completed'),
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50',
      height: 'h-32 lg:h-48'
    },
  ];

  // Colors helpers
  const getUserColor = (name) => {
    if (!name) return 'bg-slate-100 text-slate-600';

    // Hardcoded overrides
    if (name.toLowerCase().includes('nicolas')) return 'bg-yellow-100 text-yellow-800';
    if (name.toLowerCase().includes('yann')) return 'bg-blue-100 text-blue-800';
    if (name.toLowerCase().includes('jack')) return 'bg-yellow-100 text-yellow-800';
    if (name.toLowerCase().includes('elodie')) return 'bg-pink-100 text-pink-700';

    // Monday-style palette
    const colors = [
      'bg-indigo-100 text-indigo-700', // Blue-ish
      'bg-pink-100 text-pink-700',     // Pink-ish
      'bg-amber-100 text-amber-700',   // Orange-ish
      'bg-emerald-100 text-emerald-700', // Green-ish
      'bg-cyan-100 text-cyan-700',     // Cyan-ish
      'bg-fuchsia-100 text-fuchsia-700' // Purple-ish
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getStatusColor = (status) => {
    const s = (status || 'Nouveau').toLowerCase();
    if (s === 'terminé' || s === 'termine') return 'bg-green-400 text-white'; // Monday 'Done' green is solid usually
    if (s === 'en cours') return 'bg-blue-400 text-white'; // Monday 'Working on it' is orange/blue
    if (s === 'nouveau' || s === 'draft') return 'bg-slate-400 text-white';
    if (s === 'abandonné') return 'bg-red-400 text-white';
    return 'bg-slate-200 text-slate-800'; // Default gray
  };

  const getTypeColor = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('construction')) return 'bg-purple-400 text-white';
    if (t.includes('rénovation') || t.includes('renovation')) return 'bg-orange-400 text-white';
    if (t.includes('location')) return 'bg-teal-400 text-white';
    return 'bg-gray-300 text-gray-800';
  };


  const navItems = [
    { id: 'dashboard', label: 'Mon tableau de bord', icon: LayoutDashboard },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'projects', label: 'Projets', icon: FolderHeart },
    { id: 'calendar', label: 'Calendrier', icon: Calendar },
    { id: 'reports', label: 'Rapports', icon: FileText },
  ];

  // Handlers
  const handleLogout = async () => {
    try {
      await apiService.logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleUserUpdate = (updatedUser) => {
    // Force refresh or update local state if needed. 
    // Usually auth context handles this via onAuthStateChanged, so a simple reload or state update might be enough.
    // We'll rely on global auth state updates, but we can force a re-render if needed.
    window.location.reload();
  };

  const handleAddContact = () => {
    setEditingContact({ id: Date.now(), name: '', company: '', email: '', phone: '', city: '', status: 'Prospect', color: 'bg-blue-500' });
    setShowContactModal(true);
  };

  const handleEditContact = (contact) => {
    setEditingContact({ ...contact });
    setShowContactModal(true);
  };

  const handleSaveContact = async () => {
    try {
      const userName = currentUser.name;
      if (editingContact.id && contacts.find(c => c.id === editingContact.id)) {
        await apiService.updateContact(editingContact.id, editingContact);
        setContacts(contacts.map(c => c.id === editingContact.id ? editingContact : c));
      } else {
        // Ajouter le nom de l'utilisateur au contact avant la création
        const contactWithUser = {
          ...editingContact,
          createdByFirstName: userName,
          user: userName
        };
        const newContact = await apiService.createContact(contactWithUser, false, activeTenantId);
        setContacts([...contacts, newContact]);
      }
      refreshActivities();
      setShowContactModal(false);
      setEditingContact(null);
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder le contact.", variant: "destructive" });
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm("Supprimer ce contact ?")) return;
    const contact = contacts.find(c => c.id === id);
    try {
      await apiService.deleteContact(String(id));
      setContacts(prev => prev.filter(c => c.id !== id));
      refreshActivities();
      toast({ title: "Succès", description: "Contact supprimé." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", description: "Erreur suppression.", variant: "destructive" });
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Supprimer la tâche ?")) return;
    const task = tasks.find(t => t.id === taskId);

    // Optimistic delete: visual removal first
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      await apiService.deleteTask(taskId);
      refreshActivities();
      toast({ title: "Tâche supprimée" });
    } catch (error) {
      console.error("Delete failed on server but forced locally:", error);
      // We do NOT revert the state here, effectively "forcing" the delete on the client side
      toast({
        title: "Tâche masquée",
        description: "Supprimée localement. (Erreur serveur: droits insuffisants)",
        variant: "warning"
      });
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Supprimer ce projet ?")) return;
    const project = projects.find(p => p.id === projectId);

    // Optimistic delete for projects
    setProjects(prev => prev.filter(p => p.id !== projectId));

    try {
      await apiService.deleteProject(projectId);

      // Force refresh data from server to be sure
      const freshProjects = await apiService.getProjects(activeTenantId);
      setProjects(freshProjects);

      refreshActivities();
      toast({ title: "Projet supprimé." });
    } catch (error) {
      console.error("Delete failed on server but forced locally:", error);
      toast({
        title: "Projet masqué",
        description: "Supprimé localement. (Erreur serveur possible)",
        variant: "warning"
      });
    }
  };

  /**
   * Déduplication des contacts :
   * - Regroupe les contacts par email (ou nom+prm si pas d'email)
   * - Pour chaque groupe, conserve le contact le plus "riche"
   * - Supprime les doublons et les contacts sans projets associés
   */
  const handleDeduplicateContacts = async (silent = false, initialContacts = null, initialProjects = null) => {
    try {
      const allContacts = initialContacts || await apiService.getContacts(activeTenantId);
      const allProjects = initialProjects || projects;

      const getContactKey = (c) => {
        const email = (c.email || '').trim().toLowerCase();
        if (email && email !== '-') return `email:${email}`;
        const name = (c.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const phone = (c.phone || '').trim().replace(/[\s-]/g, '');
        if (phone) return `name+phone:${name}|${phone}`;
        const city = (c.city || '').trim().toLowerCase();
        return `name+city:${name}|${city}`;
      };

      const getLinkedProjects = (contact) => {
        return (allProjects || []).filter(p =>
          (p.email && contact.email && p.email.toLowerCase() === contact.email.toLowerCase()) ||
          (p.name && contact.name && p.name.toLowerCase() === contact.name.toLowerCase()) ||
          (p.id === contact.projectId)
        );
      };

      const groups = {};
      allContacts.forEach(c => {
        const key = getContactKey(c);
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
      });

      const duplicateGroups = Object.values(groups).filter(g => g.length > 1);
      const singleWithNoProject = Object.values(groups)
        .filter(g => g.length === 1)
        .map(g => g[0])
        .filter(c => getLinkedProjects(c).length === 0);

      const toDelete = [];
      duplicateGroups.forEach(group => {
        const scored = group.map(c => ({
          contact: c,
          hasProjects: getLinkedProjects(c).length > 0,
          score: Object.values(c).filter(v => v && v !== '' && v !== '-').length
        }));
        scored.sort((a, b) => {
          if (a.hasProjects !== b.hasProjects) return b.hasProjects ? 1 : -1;
          return b.score - a.score;
        });
        scored.slice(1).forEach(s => toDelete.push(s.contact));
      });

      toDelete.push(...singleWithNoProject);
      if (toDelete.length === 0) return;

      if (!silent) {
        const confirmed = window.confirm(`⚠️ PURGE DES CONTACTS\n\n${toDelete.length} contact(s) vont être supprimés. Continuer ?`);
        if (!confirmed) return;
      }

      for (const c of toDelete) {
        await apiService.deleteContact(String(c.id), true);
      }

      if (!silent) {
        const fresh = await apiService.getContacts(activeTenantId);
        setContacts(fresh || []);
        toast({ title: "✅ Purge terminée" });
      }
    } catch (error) {
      if (!silent) console.error('Dedup error:', error);
    }
  };

  const handleGeneratePDF = async (projectId) => {

    try {
      const pData = await apiService.getProject(projectId);
      if (pData) {
        await generatePdfForProject(pData);
        toast({ title: "Succès", description: "PDF généré." });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Erreur PDF.", variant: "destructive" });
    }
  };

  const handleOpenTransferModal = (project) => {
    setTransferProjectData(project);
    setShowTransferModal(true);
  };

  const handleTransferProject = async (projectId, targetTenantId, options) => {
    try {
      await apiService.transferProject(projectId, targetTenantId, options);
      toast({ title: "Transfert réussi", description: "Le projet a été déplacé avec succès." });
    } catch (error) {
      console.error("Transfer error:", error);
      throw error;
    }
  };
  
  const handleOpenDuplicateModal = (project) => {
    setDuplicateProjectData(project);
    setShowDuplicateModal(true);
  };

  const handleDuplicateProject = async (projectId, targetTenantId, options) => {
    try {
      await apiService.duplicateProject(projectId, targetTenantId, options);
      toast({ title: "Duplication réussie", description: "Le projet a été dupliqué avec succès." });
      
      // Optionnellement rafraîchir la liste si on est sur le tenant de destination
      if (activeTenantId === targetTenantId) {
        const freshProjects = await apiService.getProjects(activeTenantId);
        setProjects(freshProjects);
      }
    } catch (error) {
      console.error("Duplication error:", error);
      throw error;
    }
  };

  const isTransferAuthorized = () => {
    if (!user) return false;
    const email = user.email?.toLowerCase();
    const firstName = (user.firstName || user.displayName || '').toLowerCase();

    // Yann et admin Nelson
    if (email === 'y.barberis@enr-courtage.fr' || email === 'contact@nelsonpv.fr') return true;

    // Détection de Véro par son prénom
    if (firstName.includes('vero') || firstName.includes('véro')) return true;

    return false;
  };

  // --- EXPORT EXCEL ---
  const exportProjectsToExcel = (projectsToExport) => {
    try {
      const data = projectsToExport.map(p => ({
        'Nom Projet': [p.name, p.zip, p.city].filter(Boolean).join(' ').toUpperCase() || 'Sans nom',
        'Client': `${p.name || ''} ${p.firstName || ''}`.trim() || 'Sans nom',
        'Commercial': p.commercial || '-',
        'Chef de projet': p.assignedUser || '-',
        'Adresse': p.address || '-',
        'Code Postal': p.zip || '-',
        'Ville': p.city || '-',
        'GPS': p.gps || '-',
        'Puissance (kWc)': p.kwc ? (p.kwc.toLowerCase().includes('kwc') ? p.kwc : `${p.kwc} kWc`) : (p.projectSize || '-'),
        'Type': p.type || 'Construction',
        'Statut': p.status === 'draft' ? 'Nouveau' : (p.status || 'Nouveau')
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Projets');

      worksheet['!cols'] = [
        { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 35 }, 
        { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }
      ];

      XLSX.writeFile(workbook, `Nelson_Projets_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast({ title: "Export réussi", description: "Le fichier Excel a été téléchargé." });
    } catch (error) {
      console.error("Export projects error:", error);
      toast({ title: "Erreur d'export", description: "Impossible d'exporter les projets.", variant: "destructive" });
    }
  };

  const exportContactsToExcel = (contactsToExport) => {
    try {
      const data = contactsToExport.map(c => {
        const associatedProjects = projects.filter(p =>
          (p.email && c.email && p.email.toLowerCase() === c.email.toLowerCase()) ||
          (p.name && c.name && p.name.toLowerCase() === c.name.toLowerCase()) ||
          (p.id === c.projectId)
        );
        const projectCommercial = associatedProjects.find(p => p.commercial)?.commercial;
        const commercial = projectCommercial || c.createdByFirstName || c.user || 'Utilisateur';

        return {
          'Nom Complet': c.name || '-',
          'Commercial': commercial,
          'Email': c.email || '-',
          'Téléphone': c.phone || '-',
          'Adresse': c.address || '-',
          'Code Postal': c.zipCode || '-',
          'Ville': c.city || '-',
          'Statut': c.status === 'draft' ? 'Nouveau' : (c.status || 'Nouveau'),
          'Nombre de Projets': associatedProjects.length
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');

      worksheet['!cols'] = [
        { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 35 }, 
        { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 18 }
      ];

      XLSX.writeFile(workbook, `Nelson_Contacts_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast({ title: "Export réussi", description: "Le fichier Excel a été téléchargé." });
    } catch (error) {
      console.error("Export contacts error:", error);
      toast({ title: "Erreur d'export", description: "Impossible d'exporter les contacts.", variant: "destructive" });
    }
  };

  // --- SELECTION PROJECTS ---
  const handleSelectProject = (projectId) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSelectAllProjects = () => {
    if (selectedProjects.length === filteredProjects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filteredProjects.map(p => p.id));
    }
  };

  // --- SELECTION CONTACTS ---
  const handleSelectContact = (contactId) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAllContacts = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };


  const handleAddTask = () => {
    setEditingTask({ id: Date.now(), title: '', contact: '', dueDate: new Date().toISOString().split('T')[0], priority: 'Moyenne', completed: false, color: 'bg-orange-500' });
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    try {
      const userName = currentUser.name;
      if (editingTask.id && tasks.find(t => t.id === editingTask.id)) {
        await apiService.updateTask(editingTask.id, editingTask);
        setTasks(tasks.map(t => t.id === editingTask.id ? editingTask : t));
      } else {
        const newTask = await apiService.createTask(editingTask, false, activeTenantId);
        setTasks([...tasks, newTask]);
      }
      refreshActivities();
      setShowTaskModal(false);
      setEditingTask(null);
      toast({ title: "Tâche enregistrée" });
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder la tâche.", variant: "destructive" });
    }
  };

  const toggleTaskComplete = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const filteredContacts = contacts.filter(c => {
    // Filtre par recherche textuelle
    const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Filtre par utilisateur
    const contactUser = c.createdByFirstName || c.user;
    const matchesUser = filterUser === 'all' || contactUser === filterUser;

    // Filtre par statut
    const matchesStatus = filterStatus === 'all' || (c.status || 'Nouveau') === filterStatus;

    return matchesSearch && matchesUser && matchesStatus;
  });

  const renderDashboard = () => (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 crm-kpi-grid">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className={`bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 ${kpi.height || ''} flex flex-col justify-between hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between mb-2 lg:mb-4">
                <div className={`${kpi.bgLight} p-1.5 lg:p-3 rounded-lg lg:rounded-xl`}><Icon className={`w-4 h-4 lg:w-6 lg:h-6 ${kpi.color.replace('bg-', 'text-')}`} /></div>
                <span className={`text-[10px] lg:text-sm font-semibold px-1.5 lg:py-1 rounded-full ${kpi.trendPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{kpi.trend}</span>
              </div>
              <div className="mt-auto">
                <p className="text-lg lg:text-2xl font-bold text-slate-900 mb-0.5">{kpi.value}</p>
                <p className="text-[10px] lg:text-sm text-slate-600 line-clamp-1">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        <div className="lg:col-span-2 space-y-8 flex flex-col">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex-1 flex flex-col">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Nouveaux Projets</h2>
            <div className="space-y-4 flex-1">
              {projects
                .filter(p => !p.status || p.status === 'Nouveau' || p.status === 'draft')
                .sort((a, b) => (new Date(b.createdAt || 0) - new Date(a.createdAt || 0)) || (b.id - a.id)) // Sort by newest (using createdAt or fallback to id)
                .slice(0, 8) // Limit to 8 items
                .map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <div><div className="font-bold text-slate-900">{p.name || 'Projet'}</div><div className="text-xs text-slate-500">{p.city || '-'} • {p.status === 'draft' ? 'Nouveau' : (p.status || 'Nouveau')}</div></div>
                    <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => navigate(`/project/${p.id}/edit`)}><ExternalLink className="w-4 h-4" /></Button>
                  </div>
                ))}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Activités récentes</h2>
          <div className="space-y-4 flex-1 overflow-y-auto">
            {activities.length > 0 ? activities.slice(0, 9).map(a => {
              const colors = { project: 'bg-green-500', contact: 'bg-blue-500', task: 'bg-orange-500', user: 'bg-indigo-500' };
              // Résoudre la photo de l'utilisateur : d'abord depuis l'activité, sinon depuis la liste des utilisateurs
              const activityUser = users.find(u => u.id === a.userId);
              const photoURL = activityUser?.photoURL || a.userPhotoURL;
              return (
                <div key={a.id} className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt={a.userName || 'User'}
                      className="w-10 h-10 rounded-full flex-shrink-0 object-cover border-2 border-white shadow"
                    />
                  ) : (
                    <div className={`${colors[a.type] || 'bg-slate-500'} w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
                      {a.userName?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 leading-snug">
                      {a.description?.replace(/ACAMA|GREEN INVEST/g, 'un tiers')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(a.timestamp)}
                    </p>
                  </div>
                </div>
              );
            }) : <div className="text-center py-10 text-slate-500 text-sm">Aucune activité récente</div>}
          </div>
        </div>
      </div>
    </div>
  );

  // Rendu de la liste des Contacts
  const renderContacts = () => (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un contact..."
              className="w-full pl-10 pr-4 py-2 bg-white shadow-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="flex-1 md:flex-none px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[140px]"
            >
              <option value="all">Tous les utilisateurs</option>
              {tenantUsers.map(u => (
                <option key={u.id} value={u.firstName || u.displayName}>{u.firstName || u.displayName || 'Utilisateur'}</option>
              ))}
            </select>

            <div className="flex flex-1 md:flex-none gap-2 items-center">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[120px]"
              >
                <option value="all">Tous les statuts</option>
                <option value="Nouveau">Nouveau</option>
                <option value="En cours">En cours</option>
                <option value="Client">Client</option>
              </select>

              <Button
                onClick={handleAddContact}
                className="lg:hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md px-3 h-9"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="text-xs">Nouveau</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-center justify-between lg:justify-end">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vue Grille"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vue Liste"
            >
              <List size={20} />
            </button>
          </div>

          {selectedContacts.length > 0 ? (
            <Button
              onClick={() => {
                const toExport = contacts.filter(c => selectedContacts.includes(c.id));
                exportContactsToExcel(toExport);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Exporter la sélection ({selectedContacts.length})
            </Button>
          ) : (
            <Button
              onClick={() => exportContactsToExcel(filteredContacts)}
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2 shadow-sm"
              disabled={filteredContacts.length === 0}
            >
              <FileDown className="w-4 h-4 text-emerald-600" />
              Exporter Excel ({filteredContacts.length})
            </Button>
          )}

          <Button
            onClick={handleAddContact}
            className="hidden lg:flex bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau contact
          </Button>
        </div>
      </div>

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <div key={contact.id} id={`contact-${contact.id}`} className={`bg-white rounded-2xl shadow-sm border p-6 hover:shadow-lg transition-all duration-300 relative ${selectedContacts.includes(contact.id) ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/5' : 'border-slate-200'}`}>
              <div className="absolute top-4 left-4 z-10">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  checked={selectedContacts.includes(contact.id)}
                  onChange={() => handleSelectContact(contact.id)}
                />
              </div>
              <div className="flex items-start justify-between mb-4 pl-6">
                <div className="flex items-center gap-3">
                  <div className={`${contact.color} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                    {contact.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{contact.name}</h3>
                    <p className="text-sm text-slate-600">{contact.company}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditContact(contact)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{contact.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4" />
                  <span>{contact.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4" />
                  <span>{contact.city}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${contact.status === 'Client' ? 'bg-green-100 text-green-700' : contact.status === 'En cours' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                  {contact.status}
                </span>
              </div>

              {(() => {
                const associatedProjects = projects.filter(p =>
                  (p.email && contact.email && p.email.toLowerCase() === contact.email.toLowerCase()) ||
                  (p.name && contact.name && p.name.toLowerCase() === contact.name.toLowerCase()) ||
                  (p.id === contact.projectId)
                );

                if (associatedProjects.length === 0) return null;

                return (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projets ({associatedProjects.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {associatedProjects.map(project => (
                        <div key={project.id} className="flex flex-col gap-1 w-full bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{project.name || 'Projet'}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{project.status || 'Nouveau'}</Badge>
                          </div>
                          <div className="flex gap-1 mt-1">
                            <Button
                              onClick={() => navigate(`/project/${project.id}/edit`)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] h-7"
                              size="sm"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Ouvrir
                            </Button>
                            <Button
                              onClick={() => generatePdfForProject(project)}
                              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] h-7"
                              size="sm"
                            >
                              <FileDown className="w-3 h-3 mr-1" />
                              PDF
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase w-10">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      checked={filteredContacts.length > 0 && selectedContacts.length === filteredContacts.length}
                      onChange={handleSelectAllContacts}
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Commercial</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Téléphone</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">ADRESSE</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">CODE POSTAL</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Ville</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Projets</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} id={`contact-${contact.id}`} className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedContacts.includes(contact.id) ? 'bg-blue-50/20' : ''}`}
                    onClick={(e) => { if (!e.target.closest('button, input, a, select')) handleEditContact(contact); }}
                  >
                    <td className="px-6 py-4 w-10">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => handleSelectContact(contact.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{contact.name}</td>
                    <td className="px-6 py-4">
                      {(() => {
                        // On récupère le commercial du PREMIER projet associé (priorité au projet)
                        const associatedProjects = projects.filter(p =>
                          (p.email && contact.email && p.email.toLowerCase() === contact.email.toLowerCase()) ||
                          (p.name && contact.name && p.name.toLowerCase() === contact.name.toLowerCase()) ||
                          (p.id === contact.projectId)
                        );
                        
                        const projectCommercial = associatedProjects.find(p => p.commercial)?.commercial;
                        let contactCreator = projectCommercial || contact.createdByFirstName || contact.user;
                        let photoURL = null;

                        if (!contactCreator || contactCreator === 'Utilisateur') {
                          if (contact.createdBy && users.length > 0) {
                            const userFromList = users.find(u => u.id === contact.createdBy);
                            if (userFromList) {
                              contactCreator = userFromList.firstName || userFromList.displayName;
                              photoURL = userFromList.photoURL;
                            }
                          }
                        }

                        if (contactCreator && !photoURL && users.length > 0) {
                          const userWithPhoto = users.find(u =>
                            (u.firstName && u.firstName.toLowerCase() === contactCreator.toLowerCase()) ||
                            (u.displayName && u.displayName.toLowerCase() === contactCreator.toLowerCase())
                          );
                          if (userWithPhoto) photoURL = userWithPhoto.photoURL;
                        }

                        const avatarSrc = photoURL ||
                          (contactCreator?.toLowerCase().trim().includes('jack') ? '/assets/avatars/jack.jpg' : null);

                        return (
                          <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full ${getUserColor(contactCreator)} w-fit pr-5 text-left`}>
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/40 flex-shrink-0 border border-white/20">
                              {avatarSrc ?
                                <img src={avatarSrc} className="w-full h-full object-cover" alt={contactCreator} /> :
                                <span className="flex items-center justify-center w-full h-full text-xs font-bold">{contactCreator?.[0]}</span>
                              }
                            </div>
                            <span className="text-sm font-semibold truncate max-w-[120px]">{contactCreator || 'Utilisateur'}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{contact.email}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{contact.phone}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{contact.address || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{contact.zipCode || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{contact.city}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold text-center shadow-sm w-full block max-w-[120px] ${getStatusColor(contact.status)}`}>
                        {contact.status === 'draft' ? 'Nouveau' : (contact.status || 'Nouveau')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const associatedProjects = projects.filter(p =>
                          (p.email && contact.email && p.email.toLowerCase() === contact.email.toLowerCase()) ||
                          (p.name && contact.name && p.name.toLowerCase() === contact.name.toLowerCase()) ||
                          (p.id === contact.projectId)
                        );

                        // Si on voit un contact ici, il DOIT avoir des projets suite au filtre dans useEffect
                        // Mais on garde la sécurité au cas où
                        if (associatedProjects.length === 0) return <span className="text-slate-400 text-xs italic">Aucun</span>;

                        return (
                          <div className="flex flex-col gap-1">
                            {associatedProjects.map(project => (
                              <Button
                                key={project.id}
                                variant="link"
                                size="sm"
                                onClick={() => navigate(`/project/${project.id}/edit`)}
                                className="text-blue-600 hover:text-blue-800 p-0 h-auto font-medium text-left justify-start group"
                              >
                                <span className="truncate max-w-[150px] inline-block">
                                  {[project.name, project.city].filter(Boolean).join(' - ')}
                                </span>
                                <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Button>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditContact(contact)}>
                          <Edit className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteContact(contact.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );



  // Rendu de la liste des Tâches
  const renderTasks = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Tâches</h2>
        <div className="flex gap-4 items-center">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setTaskViewMode('card')}
              className={`p-2 rounded-md transition-all ${taskViewMode === 'card' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vue Carte"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setTaskViewMode('list')}
              className={`p-2 rounded-md transition-all ${taskViewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vue Liste"
            >
              <List size={20} />
            </button>
          </div>
          <Button
            onClick={handleAddTask}
            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle tâche
          </Button>
        </div>
      </div>

      {taskViewMode === 'card' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              En cours
            </h3>
            <div className="space-y-3">
              {tasks.filter(t => !t.completed).map((task) => (
                <div key={task.id} className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskComplete(task.id)}
                      className="mt-1 w-5 h-5 rounded border-2 border-slate-300 hover:border-blue-500 transition-colors"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{task.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{task.contact}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${task.priority === 'Haute' ? 'bg-red-100 text-red-700' :
                          task.priority === 'Moyenne' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Terminées
            </h3>
            <div className="space-y-3">
              {tasks.filter(t => t.completed).map((task) => (
                <div key={task.id} className="p-4 bg-green-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskComplete(task.id)}
                      className="mt-1 w-5 h-5 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 line-through">{task.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{task.contact}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Tâche</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Echéance</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Priorité</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase">Statut</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={(e) => { if (!e.target.closest('button, input, a, select')) { setEditingTask(task); setShowTaskModal(true); } }}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">{task.title}</td>
                    <td className="px-6 py-4 text-slate-600">{task.contact}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{new Date(task.dueDate).toLocaleDateString('fr-FR')}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${task.priority === 'Haute' ? 'bg-red-100 text-red-700' :
                        task.priority === 'Moyenne' ? 'bg-orange-100 text-orange-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleTaskComplete(task.id)}
                        className={`mx-auto w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${task.completed ? 'border-green-500 bg-green-500' : 'border-slate-300 hover:border-blue-500'
                          }`}
                      >
                        {task.completed && (
                          <div className="flex items-center gap-2">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                      {task.completed && <span className="ml-2 text-green-600 font-medium">Fait</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingTask(task);
                          setShowTaskModal(true);
                        }}>
                          <Edit className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // Rendu du Calendrier
  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {monthNames[month]} {year}
            </h2>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center font-semibold text-slate-600 text-sm py-2">
                {day}
              </div>
            ))}
            {days.map((day, idx) => {
              const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
              const dayTasks = day ? tasks.filter(t => t.dueDate === dateStr) : [];
              const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();

              return (
                <div
                  key={idx}
                  className={`min-h-[80px] p-2 rounded-lg border cursor-pointer transition-colors ${day ? 'bg-white border-slate-200 hover:bg-blue-50' : 'bg-slate-50 border-transparent'
                    } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => {
                    if (day) {
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      setEditingTask({
                        id: Date.now(),
                        title: '',
                        contact: '',
                        dueDate: dateStr,
                        priority: 'Moyenne',
                        completed: false,
                        color: 'bg-orange-500'
                      });
                      setShowTaskModal(true);
                    }
                  }}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayTasks.map((task) => {
                          const priorityColor = task.priority === 'Haute' ? 'bg-red-500' :
                            task.priority === 'Moyenne' ? 'bg-orange-500' :
                              'bg-green-500';
                          const textColor = task.priority === 'Haute' ? 'text-red-700' :
                            task.priority === 'Moyenne' ? 'text-orange-700' :
                              'text-green-700';

                          return (
                            <div
                              key={task.id}
                              className={`group flex items-center justify-between text-xs px-1.5 py-0.5 rounded ${priorityColor} bg-opacity-20 ${textColor} transition-all hover:bg-opacity-35 cursor-pointer`}
                              title={task.title}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTask(task);
                                setShowTaskModal(true);
                              }}
                            >
                              <span className="truncate flex-1">{task.title}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 rounded text-red-600 transition-opacity ml-1 flex-shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Filtered Projects Logic (Lifted for Count)
  const filteredProjects = projects.filter(p => {
    // Search
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.city || '').toLowerCase().includes(searchTerm.toLowerCase());

    // User
    const projectUser = p.assignedUser || p.createdByFirstName || (typeof p.user === 'string' ? p.user : null);
    const matchesUser = filterUser === 'all' || projectUser === filterUser;

    // Type
    const matchesType = filterType === 'all' || (p.type || 'Construction') === filterType;

    // Status
    const currentStatus = p.status === 'draft' ? 'Nouveau' : (p.status || 'Nouveau');
    const matchesStatus = filterStatus === 'all' || currentStatus === filterStatus;

    // Mes Projets
    let matchesMyProjects = true;
    // user is from useAuth(), assumed available in scope as 'user'
    if (filterMyProjects && user) {
      // Prepare user identifiers
      const userId = user.uid;
      const userFirst = user.firstName || '';
      const userDisplay = user.displayName || '';
      const userFull = `${userFirst} ${user.lastName || ''}`.trim();
      const userNames = [userFirst, userDisplay, userFull].filter(Boolean).map(n => n.toLowerCase());
      const isYann = userNames.includes('yann');

      const isCreator = p.creatorId === userId;
      const isCommercialId = p.commercialId === userId;
      const isCommercialName = p.commercial && userNames.includes(p.commercial.toLowerCase());

      // Affectation (Assigned User) logic
      // Matches if assignedUser matches name OR if assignedUser is empty and user is Yann (default fallback)
      const assignedVal = (p.assignedUser || '').toLowerCase();
      const isAssigned = assignedVal ? userNames.includes(assignedVal) : isYann;

      matchesMyProjects = isCreator || isCommercialId || isCommercialName || isAssigned;
    }

    return matchesSearch && matchesUser && matchesType && matchesStatus && matchesMyProjects;
  });

  // Rendu de la liste des Projets
  const renderProjects = () => (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2 bg-white shadow-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Filtre Utilisateur */}
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="flex-1 md:flex-none px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[140px]"
            >
              <option value="all">Tous les utilisateurs</option>
              {tenantUsers.map(u => (
                <option key={u.id} value={u.firstName || u.displayName}>{u.firstName || u.displayName || 'Utilisateur'}</option>
              ))}
            </select>

            {/* Filtre Type */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex-1 md:flex-none px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[120px]"
            >
              <option value="all">Tous les types</option>
              <option value="Construction">Construction</option>
              <option value="Rénovation">Rénovation</option>
              <option value="Construction & Rénovation">Construction & Rénovation</option>
              <option value="Location">Location</option>
            </select>

            <div className="flex flex-wrap gap-2 items-center w-full md:w-auto mt-2 md:mt-0">
              {/* Filtre Mes Projets */}
              <button
                type="button"
                onClick={() => setFilterMyProjects(!filterMyProjects)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  filterMyProjects
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <UserCircle className="w-4 h-4" />
                <span>Mes projets</span>
              </button>

              {/* Filtres Statuts (Boutons identiques à l'onglet Dossiers) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {[
                  { id: 'all', label: 'Tous' },
                  { id: 'Nouveau', label: 'Nouveau' },
                  { id: 'En cours', label: 'En cours' },
                  { id: 'Terminé', label: 'Terminé' },
                  { id: 'Abandonné', label: 'Abandonné' }
                ].map((st) => {
                  const isActive = filterStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setFilterStatus(st.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={() => navigate('/project/new/edit')}
                className="lg:hidden flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md h-9 px-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="text-xs">Nouveau</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-center justify-between lg:justify-end">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vue Grille"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vue Liste"
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-md transition-all ${viewMode === 'map' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vue Carte"
            >
              <MapIcon size={20} />
            </button>
          </div>

          {selectedProjects.length > 0 ? (
            <Button
              onClick={() => {
                const toExport = projects.filter(p => selectedProjects.includes(p.id));
                exportProjectsToExcel(toExport);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Exporter la sélection ({selectedProjects.length})
            </Button>
          ) : (
            <Button
              onClick={() => exportProjectsToExcel(filteredProjects)}
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2 shadow-sm"
              disabled={filteredProjects.length === 0}
            >
              <FileDown className="w-4 h-4 text-emerald-600" />
              Exporter Excel ({filteredProjects.length})
            </Button>
          )}

          <Button
            onClick={() => navigate('/project/new/edit')}
            className="hidden lg:flex bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Projet
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {viewMode === 'map' ? (
          <div className="p-4">
            <ProjectsMap projects={filteredProjects} />
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            {/* ... Existing Table Code ... */}

            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-2 py-3 text-left font-semibold text-slate-700 uppercase w-8">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      checked={filteredProjects.length > 0 && selectedProjects.length === filteredProjects.length}
                      onChange={handleSelectAllProjects}
                    />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700 uppercase max-w-[140px]">Nom Projet</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700 uppercase max-w-[120px]">Client</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700 uppercase">Commercial</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700 uppercase">Chef de projet</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700 uppercase max-w-[140px]">Adresse</th>
                  <th className="px-2 py-3 text-left font-semibold text-slate-700 uppercase">CP</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700 uppercase max-w-[100px]">Ville</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700 uppercase max-w-[120px]">GPS</th>
                  <th className="px-2 py-3 text-left font-semibold text-blue-600 uppercase w-[75px]">Puissance</th>
                  <th className="px-1.5 py-3 text-center font-semibold text-slate-700 uppercase w-[85px]">Type</th>
                  <th className="px-1.5 py-3 text-center font-semibold text-slate-700 uppercase w-[85px]">Statut</th>
                  <th className="pl-1 pr-2 py-3 text-right font-semibold text-slate-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedProjects.includes(project.id) ? 'bg-blue-50/20' : ''}`}
                    onClick={(e) => { if (!e.target.closest('button, input, a, select')) navigate(`/project/${project.id}/edit`); }}
                  >
                    <td className="px-2 py-3 w-8">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        checked={selectedProjects.includes(project.id)}
                        onChange={() => handleSelectProject(project.id)}
                      />
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900 max-w-[140px] truncate" title={[project.name, project.zip, project.city].filter(Boolean).join(' ').toUpperCase()}>
                      {[project.name, project.zip, project.city].filter(Boolean).join(' ').toUpperCase() || 'Sans nom'}
                    </td>
                    <td className="px-3 py-3 max-w-[120px] truncate">
                      {(() => {
                        const name = project.name || '';
                        const firstName = project.firstName || '';
                        const clientName = `${name} ${firstName}`.trim() || 'Sans nom';
                        return <span className="text-slate-900 font-medium" title={clientName}>{clientName}</span>;
                      })()}
                    </td>
                    <td className="px-3 py-3">
                      {(() => {
                        const commercial = project.commercial;
                        let photoURL = null;
                        if (users.length > 0 && commercial) {
                          const userByName = users.find(u =>
                            (u.firstName && u.firstName.toLowerCase() === commercial.toLowerCase()) ||
                            (u.displayName && u.displayName.toLowerCase() === commercial.toLowerCase())
                          );
                          if (userByName?.photoURL) photoURL = userByName.photoURL;
                        }
                        if (!commercial) return <span className="text-slate-400 text-xs italic">-</span>;
                        return (
                          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${getUserColor(commercial)} w-fit pr-3 text-left`}>
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-white/40 flex-shrink-0 border border-white/20">
                              <UserAvatar name={commercial} photoURL={photoURL} size="w-full h-full" showName={false} />
                            </div>
                            <span className="text-xs font-bold truncate max-w-[90px]">{commercial}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-3">
                      {(() => {
                        const projectUser = project.assignedUser;
                        if (!projectUser) return <span className="text-slate-400 text-xs italic">-</span>;
                        return (
                          <div className="flex items-center gap-2 w-fit pr-3 text-left">
                            <UserAvatar name={projectUser} size="w-6 h-6" showName={false} />
                            <span className="text-xs font-bold truncate max-w-[90px]">{projectUser}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-3 text-slate-600 max-w-[140px] truncate" title={project.address || '-'}>{project.address || '-'}</td>
                    <td className="px-2 py-3 text-slate-600 whitespace-nowrap">{project.zip || '-'}</td>
                    <td className="px-3 py-3 text-slate-600 max-w-[100px] truncate" title={project.city || '-'}>{project.city || '-'}</td>
                    <td className="px-3 py-3 text-slate-600 max-w-[120px] truncate" title={project.gps || '-'}>{project.gps || '-'}</td>
                    <td className="px-2 py-3 text-slate-900 font-bold whitespace-nowrap w-[75px]">
                      {project.kwc ? (project.kwc.toString().toLowerCase().includes('kwc') ? project.kwc : `${project.kwc} kWc`) : '-'}
                    </td>
                    <td className="px-1.5 py-3 whitespace-nowrap w-[85px]">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-bold shadow-sm block text-center w-full ${getTypeColor(project.type)}`}>
                        {project.type || 'Construction'}
                      </span>
                    </td>
                    <td className="px-1.5 py-3 whitespace-nowrap w-[85px]">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-bold shadow-sm block text-center w-full ${getStatusColor(project.status)}`}>
                        {project.status === 'draft' ? 'Nouveau' : (project.status || 'Nouveau')}
                      </span>
                    </td>
                    <td className="pl-1 pr-2 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end items-center gap-0.5">
                        {isTransferAuthorized() && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenTransferModal(project)}
                              className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              title="Transférer entreprise"
                            >
                              <Shuffle className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDuplicateModal(project)}
                              className="h-7 w-7 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                              title="Dupliquer le projet"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/project/${project.id}/edit`)}
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Modifier"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGeneratePDF(project.id)}
                          className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Générer PDF"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProject(project.id)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                      Aucun projet trouvé. Créez votre premier projet !
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div key={project.id} className={`bg-white border rounded-xl p-4 hover:shadow-md transition-shadow relative ${selectedProjects.includes(project.id) ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/5' : 'border-slate-200'}`}>
                <div className="absolute top-4 left-4 z-10">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    checked={selectedProjects.includes(project.id)}
                    onChange={() => handleSelectProject(project.id)}
                  />
                </div>
                <div className="flex justify-between items-start mb-2 pl-6">
                  <div className="font-bold text-lg text-slate-800">{project.projectSize || project.name || 'Projet'}</div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {project.type || 'Standard'}
                  </span>
                </div>
                <div className="text-sm text-slate-600 mb-4">
                  <div>{project.name} {project.firstName}</div>
                  <div className="flex items-center gap-1 mt-1"><MapPin size={14} /> {project.city || '?'}</div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  <Button size="sm" className="flex-1 bg-blue-600" onClick={() => navigate(`/project/${project.id}/edit`)}>Ouvrir</Button>
                  {isTransferAuthorized() && (
                    <div className="flex gap-2">
                       <Button
                        size="sm"
                        variant="ghost"
                        className="text-amber-600 hover:bg-amber-50"
                        onClick={() => handleOpenTransferModal(project)}
                        title="Transférer entreprise"
                      >
                        <Shuffle size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-500 hover:bg-blue-50"
                        onClick={() => handleOpenDuplicateModal(project)}
                        title="Dupliquer le projet"
                      >
                        <Copy size={16} />
                      </Button>
                    </div>
                  )}
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteProject(project.id)}><Trash2 size={16} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Rendu des Rapports
  const renderReports = () => {
    // Calculs KPI demandés
    const projectsTotal = projects.length;
    const projectsCompleted = projects.filter(p => p.status === 'Terminé').length;
    const projectConversionRate = projectsTotal > 0 ? (projectsCompleted / projectsTotal * 100).toFixed(1) : '0';

    const contactsTotal = contacts.length;
    const contactsClients = contacts.filter(c => c.status === 'Client').length;
    const contactConversionRate = contactsTotal > 0 ? (contactsClients / contactsTotal * 100).toFixed(1) : '0';

    const statusDistribution = [
      { name: 'Nouveau', count: projects.filter(p => !p.status || p.status === 'Nouveau' || p.status === 'draft').length, color: 'bg-blue-500' },
      { name: 'En cours', count: projects.filter(p => p.status === 'En cours').length, color: 'bg-yellow-500' },
      { name: 'Terminé', count: projects.filter(p => p.status === 'Terminé').length, color: 'bg-green-500' },
    ];

    // Group projects by User
    const userStats = {};
    projects.forEach(p => {
      // Priorité : assignedUser > createdByFirstName > user > 'Non assigné'
      const u = p.user || p.assignedUser || p.createdByFirstName || 'Non assigné';
      if (!userStats[u]) userStats[u] = { name: u, nouveau: 0, enCours: 0, termine: 0, score: 0 };

      const pStatus = p.status === 'draft' ? 'Nouveau' : (p.status || 'Nouveau');

      if (pStatus === 'Nouveau') userStats[u].nouveau++;
      else if (pStatus === 'En cours') userStats[u].enCours++;
      else if (pStatus === 'Terminé') userStats[u].termine++;

      // Score = Nouveau + En cours
      if (pStatus === 'Nouveau' || pStatus === 'En cours') {
        userStats[u].score++;
      }
    });

    const usersList = Object.values(userStats);
    const sortedByNew = [...usersList].sort((a, b) => b.nouveau - a.nouveau);
    const sortedByRunning = [...usersList].sort((a, b) => b.enCours - a.enCours);
    const sortedByFinished = [...usersList].sort((a, b) => b.termine - a.termine);
    const sortedByOpp = [...usersList].sort((a, b) => b.score - a.score);

    const RankingCard = ({ title, icon: Icon, data, countKey, colorBg, colorText, colorBorder }) => (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Icon className={`w-5 h-5 ${colorText}`} />
          {title}
        </h3>
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px]">
          {data.filter(u => u[countKey] > 0).map((u, index) => (
            <div key={u.name} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${index < 3 ? colorBg : 'bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-white/50' : 'bg-slate-200 text-slate-600'}`}>
                  {index + 1}
                </div>
                <span className="font-semibold text-slate-900">{u.name}</span>
              </div>
              <span className={`font-bold ${colorText} text-lg`}>{u[countKey]}</span>
            </div>
          ))}
          {data.filter(u => u[countKey] > 0).length === 0 && (
            <div className="text-slate-400 italic text-center py-4">Aucune donnée</div>
          )}
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        {/* KPIs Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckSquare className="w-8 h-8 opacity-80" />
              <Activity className="w-6 h-6 opacity-60" />
            </div>
            <div className="text-3xl font-bold">{projectsTotal}</div>
            <div className="text-blue-100 text-sm mt-1">Projets totaux</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 opacity-80" />
              <BarChart3 className="w-6 h-6 opacity-60" />
            </div>
            <div className="text-3xl font-bold">{projectsCompleted}</div>
            <div className="text-green-100 text-sm mt-1">Projets Terminés</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <PieChart className="w-8 h-8 opacity-80" />
              <CheckCircle2 className="w-6 h-6 opacity-60" />
            </div>
            <div className="text-3xl font-bold">{projectConversionRate}%</div>
            <div className="text-purple-100 text-sm mt-1">Taux transfo. projets</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckSquare className="w-8 h-8 opacity-80" />
              <Activity className="w-6 h-6 opacity-60" />
            </div>
            <div className="text-3xl font-bold">{projectConversionRate}%</div>
            <div className="text-orange-100 text-sm mt-1">Taux de transformation</div>
          </div>
        </div>

        {/* 3 Zones Distinctes : Nouveaux, En cours, Terminés */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <RankingCard
            title="Nouveaux Projets"
            icon={AlertCircle}
            data={sortedByNew}
            countKey="nouveau"
            colorBg="bg-blue-50"
            colorText="text-blue-600"
            colorBorder="border-blue-200"
          />
          <RankingCard
            title="Projets En Cours"
            icon={Activity}
            data={sortedByRunning}
            countKey="enCours"
            colorBg="bg-yellow-50"
            colorText="text-yellow-600"
            colorBorder="border-yellow-200"
          />
          <RankingCard
            title="Projets Terminés"
            icon={CheckCircle2}
            data={sortedByFinished}
            countKey="termine"
            colorBg="bg-green-50"
            colorText="text-green-600"
            colorBorder="border-green-200"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top opportunités (Classement) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Top Opportunités (Nouveaux + En cours)
            </h3>
            <div className="space-y-3">
              {sortedByOpp.filter(u => u.score > 0).map((u, index) => (
                <div key={u.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-200' : index === 1 ? 'bg-slate-200 text-slate-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex gap-2">
                        <span className="text-blue-600 font-medium">{u.nouveau} Nouv.</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-yellow-600 font-medium">{u.enCours} En cours</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 text-lg">{u.score}</div>
                    <div className="text-xs text-slate-500">Projets</div>
                  </div>
                </div>
              ))}
              {sortedByOpp.filter(u => u.score > 0).length === 0 && <div className="text-slate-400 italic text-center">Aucun classement disponible</div>}
            </div>
          </div>

          {/* Statistiques détaillées (Simplified) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Vue d'ensemble</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <div className="text-2xl font-bold text-slate-800">{contacts.length}</div>
                  <div className="text-sm text-slate-500">Base Contacts</div>
                </div>
                <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500"><Users size={20} /></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <div className="text-2xl font-bold text-slate-800">{projects.length}</div>
                  <div className="text-sm text-slate-500">Base Projets</div>
                </div>
                <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500"><Briefcase size={20} /></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <div className="text-2xl font-bold text-slate-800">{tasks.filter(t => !t.completed).length}</div>
                  <div className="text-sm text-slate-500">Tâches Actives</div>
                </div>
                <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500"><CheckSquare size={20} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 overflow-hidden" >
      {/* Backdrop for mobile CRM sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[19999] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      < div className={cn(
        "fixed inset-y-0 left-0 z-[20000] w-64 bg-slate-900 lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col shadow-2xl",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )} >
        {/* Logo */}
        < div className="p-6 border-b border-slate-700" >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            CRM Pro
          </h1>
          <p className="text-xs text-slate-400 mt-1">Gestion clients</p>
        </div >

        {/* Navigation */}
        < nav className="flex-1 p-4 space-y-1 overflow-y-auto" >
          {
            navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSearchParams({ tab: item.id });
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/50'
                    : 'hover:bg-slate-700/50'
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className={`font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })
          }
        </nav >

        {/* User Profile */}
        < div className="p-4 border-t border-slate-700" >
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/50">
            <div className={`${currentUser.color} w-20 h-20 rounded-full flex items-center justify-center text-white font-bold overflow-hidden`}>
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                currentUser.avatar
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-400">
                {currentUser.name?.includes('Gysmo') ? 'Woaf ! Woaf !!' : currentUser.role}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex-1 p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
              title="Paramètres"
            >
              <Settings className="w-4 h-4 mx-auto text-slate-400" />
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4 mx-auto text-red-400" />
            </button>
          </div>
        </div >
      </div >

      {/* Main Content */}
      < div className="flex-1 overflow-y-auto flex flex-col" >
        <div className="p-4 lg:p-8">
          {/* Mobile Header Toggle - Dark Style to match aesthetic */}
          <div className="lg:hidden flex items-center justify-between mb-6 bg-slate-900 p-4 rounded-xl shadow-lg border border-slate-700">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-white"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-white">
              {navItems.find(item => item.id === activeTab)?.label}
            </h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {navItems.find(item => item.id === activeTab)?.label}
              {activeTab === 'contacts' && <span className="text-slate-400 font-normal ml-2 text-2xl">({filteredContacts.length})</span>}
              {activeTab === 'projects' && <span className="text-slate-400 font-normal ml-2 text-2xl">({filteredProjects.length})</span>}
            </h1>
            <p className="text-slate-600">
              {activeTab === 'dashboard' && 'Vue d\'ensemble de votre activité'}
              {activeTab === 'contacts' && 'Gérez vos contacts et leurs projets'}
              {activeTab === 'projects' && 'Gérer les projets de construction et de location de toitures'}
              {activeTab === 'calendar' && 'Planifiez vos rendez-vous'}
              {activeTab === 'reports' && 'Analysez vos performances'}
            </p>
          </div>

          {/* Content */}
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'contacts' && renderContacts()}
          {activeTab === 'projects' && renderProjects()}

          {activeTab === 'calendar' && renderCalendar()}
          {activeTab === 'reports' && renderReports()}
        </div>
      </div >

      {/* Modals */}
      {/* Modals */}
      <ContactModal
        show={showContactModal}
        onClose={() => { setShowContactModal(false); setEditingContact(null); }}
        editingContact={editingContact}
        setEditingContact={setEditingContact}
        onSave={handleSaveContact}
        contacts={contacts}
      />
      <TaskModal
        show={showTaskModal}
        onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
        editingTask={editingTask}
        setEditingTask={setEditingTask}
        onSave={handleSaveTask}
        contacts={contacts}
      />

      <TransferProjectModal
        show={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setTransferProjectData(null);
        }}
        project={transferProjectData}
        onTransfer={handleTransferProject}
      />

      <DuplicateProjectModal
        show={showDuplicateModal}
        onClose={() => {
          setShowDuplicateModal(false);
          setDuplicateProjectData(null);
        }}
        project={duplicateProjectData}
        onDuplicate={handleDuplicateProject}
      />

      <UserSettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentUser={currentUser}
        onUpdate={handleUserUpdate}
      />
    </div >
  );
}