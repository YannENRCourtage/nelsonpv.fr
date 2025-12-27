import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useProjects } from '@/contexts/ProjectContext.jsx';
import { generatePdfForProject } from '@/components/AppLayout.jsx';
import { apiService } from '@/services/api.js';
import { toast } from '@/components/ui/use-toast.js';
import {
  LayoutDashboard, Users, TrendingUp, CheckSquare, Calendar, FileText,
  Plus, Search, Euro, Settings, LogOut, X, Edit, Trash2, Save, Phone,
  Mail, Building, MapPin, Tag, Clock, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, BarChart3, PieChart, Activity, FolderHeart, MapPin as MapIcon, FileDown, ExternalLink,
  List, LayoutGrid, UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import UserSettingsModal from '@/components/crm/UserSettingsModal.jsx';

// Composants Modales extraits pour éviter les problèmes de focus
const ContactModal = ({ show, onClose, editingContact, setEditingContact, onSave, contacts }) => {
  if (!show || !editingContact) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-xl font-bold text-slate-900">
            {editingContact.name ? 'Modifier le contact' : 'Nouveau contact'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nom complet</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingContact.name}
                onChange={(e) => setEditingContact(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Entreprise</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingContact.company}
                onChange={(e) => setEditingContact(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Ma Société SAS"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingContact.email}
                onChange={(e) => setEditingContact(prev => ({ ...prev, email: e.target.value }))}
                placeholder="jean@exemple.fr"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Téléphone</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingContact.phone}
                onChange={(e) => setEditingContact(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+33 6 12 34 56 78"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Ville</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingContact.city}
                onChange={(e) => setEditingContact(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Paris"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Statut</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingContact.status}
                onChange={(e) => setEditingContact(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="Prospect">Prospect</option>
                <option value="Client">Client</option>
              </select>
            </div>
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
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
};

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


export default function Crm() {
  const navigate = useNavigate();
  const { projects, setProjects } = useProjects();
  const { user } = useAuth();

  // États principaux
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState('list');
  const [contacts, setContacts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [opportunities, setOpportunities] = useState([]); // Ajout pour éviter le crash
  const [activities, setActivities] = useState([]);
  const [monthlyKpis, setMonthlyKpis] = useState(null); // Store last month's KPI values
  const [isLoading, setIsLoading] = useState(true);

  // États Modales
  const [showContactModal, setShowContactModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [taskViewMode, setTaskViewMode] = useState('list');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Charger les données initiales
  const refreshActivities = async () => {
    try {
      const latest = await apiService.getActivities(10);
      setActivities(latest || []);
    } catch (err) {
      console.error("Failed to refresh activities:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [contactsData, tasksData, activitiesData] = await Promise.all([
          apiService.getContacts(),
          apiService.getTasks(),
          apiService.getActivities(10)
        ]);
        setContacts(contactsData || []);
        setTasks(tasksData || []);
        setActivities(activitiesData || []);

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
  }, [user]);

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
    role: user?.role === 'admin' ? 'Administrateur' : 'Conseiller',
    avatar: user?.photoURL ? user.photoURL : (user?.firstName?.[0] || user?.displayName?.[0] || 'U').toUpperCase(),
    photoURL: user?.photoURL,
    color: user?.role === 'admin' ? 'bg-indigo-600' : 'bg-blue-600'
  };

  // Calculate monthly percentage changes
  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return { trend: 'N/A', trendPositive: true };
    const change = ((current - previous) / previous) * 100;
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
      ...calculateTrend(currentKpiValues.contacts, monthlyKpis?.contacts),
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      height: 'h-48'
    },
    {
      icon: FolderHeart,
      label: 'Projets en cours',
      value: currentKpiValues.projectsInProgress.toString(),
      ...calculateTrend(currentKpiValues.projectsInProgress, monthlyKpis?.projectsInProgress),
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
      height: 'h-48'
    },
    {
      icon: CheckSquare,
      label: 'Tâches en cours',
      value: currentKpiValues.tasksInProgress.toString(),
      ...calculateTrend(currentKpiValues.tasksInProgress, monthlyKpis?.tasksInProgress),
      color: 'bg-orange-500',
      bgLight: 'bg-orange-50',
      height: 'h-48'
    },
    {
      icon: CheckCircle2,
      label: 'Projets terminés',
      value: currentKpiValues.projectsCompleted.toString(),
      ...calculateTrend(currentKpiValues.projectsCompleted, monthlyKpis?.projectsCompleted),
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50',
      height: 'h-48'
    },
  ];


  const navItems = [
    { id: 'dashboard', label: 'Mon tableau de bord', icon: LayoutDashboard },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'projects', label: 'Projets', icon: FolderHeart },
    { id: 'tasks', label: 'Tâches', icon: CheckSquare },
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
        await apiService.logActivity({ type: 'contact', action: 'update', description: `${userName} a modifié le contact ${editingContact.name}`, userId: user?.uid, userName, itemId: editingContact.id });
      } else {
        const newContact = await apiService.createContact(editingContact);
        setContacts([...contacts, newContact]);
        await apiService.logActivity({ type: 'contact', action: 'create', description: `${userName} a créé le contact ${editingContact.name}`, userId: user?.uid, userName, itemId: newContact.id });
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
      await apiService.logActivity({ type: 'contact', action: 'delete', description: `${currentUser.name} a supprimé le contact ${contact?.name || id}`, userId: user?.uid, userName: currentUser.name, itemId: id });
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
      await apiService.logActivity({ type: 'task', action: 'delete', description: `${currentUser.name} a supprimé la tâche : ${task?.title || taskId}`, userId: user?.uid, userName: currentUser.name, itemId: taskId });
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
      await apiService.logActivity({ type: 'project', action: 'delete', description: `${currentUser.name} a supprimé le projet : ${project?.name || projectId}`, userId: user?.uid, userName: currentUser.name, itemId: projectId });

      // Force refresh data from server to be sure
      const freshProjects = await apiService.getProjects();
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

  const handleGeneratePDF = async (projectId) => {
    try {
      const pData = await apiService.getProject(projectId);
      if (pData) { await generatePdfForProject(pData); toast({ title: "Succès", description: "PDF généré." }); }
    } catch (err) { console.error(err); toast({ title: "Erreur", description: "Erreur PDF.", variant: "destructive" }); }
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
        await apiService.logActivity({ type: 'task', action: 'update', description: `${userName} a modifié la tâche : ${editingTask.title}`, userId: user?.uid, userName, itemId: editingTask.id });
      } else {
        const newTask = await apiService.createTask(editingTask);
        setTasks([...tasks, newTask]);
        await apiService.logActivity({ type: 'task', action: 'create', description: `${userName} a créé la tâche : ${editingTask.title}`, userId: user?.uid, userName, itemId: newTask.id });
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

  const filteredContacts = contacts.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 ${kpi.height || ''} flex flex-col justify-between hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`${kpi.bgLight} p-3 rounded-xl`}><Icon className={`w-6 h-6 ${kpi.color.replace('bg-', 'text-')}`} /></div>
                <span className={`text-sm font-semibold px-2 py-1 rounded-full ${kpi.trendPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{kpi.trend}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-1">{kpi.value}</p>
              <p className="text-sm text-slate-600">{kpi.label}</p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        <div className="lg:col-span-2 space-y-8 flex flex-col">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex-1 flex flex-col">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Nouveaux Projets</h2>
            <div className="space-y-4 flex-1">
              {projects.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div><div className="font-bold text-slate-900">{p.name || 'Projet'}</div><div className="text-xs text-slate-500">{p.city || '-'} • {p.status}</div></div>
                  <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => navigate(`/project/${p.id}/edit`)}><ExternalLink className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Activités récentes</h2>
          <div className="space-y-4 flex-1 overflow-y-auto">
            {activities.length > 0 ? activities.slice(0, 8).map(a => {
              const colors = { project: 'bg-green-500', contact: 'bg-blue-500', task: 'bg-orange-500', user: 'bg-indigo-500' };
              return (
                <div key={a.id} className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className={`${colors[a.type] || 'bg-slate-500'} w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>{a.userName?.[0]?.toUpperCase() || 'U'}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm text-slate-900 leading-snug">{a.description}</p><p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(a.timestamp)}</p></div>
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
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un contact..."
            className="w-full pl-10 pr-4 py-2 bg-white shadow-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-4 items-center">
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

          <Button
            onClick={handleAddContact}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau contact
          </Button>
        </div>
      </div>

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <div key={contact.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
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

              {contact.hasProject && contact.projectId && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                  <Button
                    onClick={() => navigate(`/project/${contact.projectId}/edit`)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ouvrir le projet
                  </Button>
                  <Button
                    onClick={() => {
                      const project = projects.find(p => p.id === contact.projectId);
                      if (project) {
                        generatePdfForProject(project);
                      }
                    }}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm"
                    size="sm"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Télécharger PDF
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Entreprise</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Téléphone</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Ville</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Projets</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{contact.name}</td>
                    <td className="px-6 py-4 text-slate-600">{contact.company}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{contact.email}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{contact.phone}</td>
                    <td className="px-6 py-4 text-slate-600">{contact.city}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${contact.status === 'Client' ? 'bg-green-100 text-green-700' :
                        contact.status === 'En cours' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {contact.hasProject && contact.projectId && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => navigate(`/project/${contact.projectId}/edit`)}
                          className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                        >
                          Voir projet
                        </Button>
                      )}
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
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors">
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
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingTask(task);
                          setIsTaskModalOpen(true);
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
                        {dayTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`text-xs px-1.5 py-0.5 rounded ${task.color} bg-opacity-20 ${task.color.replace('bg-', 'text-')} truncate`}
                            title={task.title}
                          >
                            {task.title.substring(0, 15)}
                          </div>
                        ))}
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

  // Rendu de la liste des Projets
  const renderProjects = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Projets</h2>
          <p className="text-slate-500">Gérez les projets de construction et location de toitures</p>
        </div>

        <div className="flex gap-4 items-center">
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

          <Button
            onClick={() => navigate('/project/new/edit')}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Projet
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Nom Projet</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Utilisateur</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Ville</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Coordonnées GPS</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Type</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.filter(p =>
                  (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (p.city || '').toLowerCase().includes(searchTerm.toLowerCase())
                ).map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {[project.name, project.postalCode, project.city].filter(Boolean).join(' ').toUpperCase() || 'Sans nom'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{project.name} {project.firstName}</td>
                    <td className="px-6 py-4 text-slate-600">{project.createdByFirstName || project.user || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{project.city || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{project.gpsCoordinates || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {project.type || 'Construction'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/project/${project.id}/edit`)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGeneratePDF(project.id)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Générer PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
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
            {projects.filter(p =>
              (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (p.city || '').toLowerCase().includes(searchTerm.toLowerCase())
            ).map((project) => (
              <div key={project.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
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
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => {
                    if (window.confirm("Supprimer ce projet ?")) {
                      toast({ title: "Info", description: "Suppression non implémentée depuis cette vue." });
                    }
                  }}><Trash2 size={16} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div >
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
      { name: 'Nouveau', count: projects.filter(p => p.status === 'Nouveau').length, color: 'bg-blue-500' },
      { name: 'En cours', count: projects.filter(p => p.status === 'En cours').length, color: 'bg-yellow-500' },
      { name: 'Terminé', count: projects.filter(p => p.status === 'Terminé').length, color: 'bg-green-500' },
    ];

    // Group projects by User
    const userStats = {};
    projects.forEach(p => {
      const u = p.user || 'Non assigné';
      if (!userStats[u]) userStats[u] = { name: u, nouveau: 0, enCours: 0, termine: 0, score: 0 };

      if (p.status === 'Nouveau') userStats[u].nouveau++;
      else if (p.status === 'En cours') userStats[u].enCours++;
      else if (p.status === 'Terminé') userStats[u].termine++;

      // Score = Nouveau + En cours
      if (p.status === 'Nouveau' || p.status === 'En cours') {
        userStats[u].score++;
      }
    });

    const sortedUsers = Object.values(userStats).sort((a, b) => b.score - a.score);

    return (
      <div className="space-y-6">
        {/* KPIs Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckSquare className="w-8 h-8 opacity-80" />
              <Activity className="w-6 h-6 opacity-60" />
            </div>
            <div className="text-3xl font-bold">{projectsCompleted}</div>
            <div className="text-blue-100 text-sm mt-1">Projets terminés</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 opacity-80" />
              <BarChart3 className="w-6 h-6 opacity-60" />
            </div>
            <div className="text-3xl font-bold">{contactsClients}</div>
            <div className="text-green-100 text-sm mt-1">Contacts clients</div>
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
            <div className="text-3xl font-bold">{contactConversionRate}%</div>
            <div className="text-orange-100 text-sm mt-1">Taux transfo. contacts</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Répartition par utilisateur */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Répartition par utilisateur
            </h3>
            <div className="space-y-6">
              {sortedUsers.map((u) => (
                <div key={u.name} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-700">{u.name}</span>
                    <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-full text-slate-600">Total: {u.nouveau + u.enCours + u.termine}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 text-center">
                      <span className="font-bold block text-sm">{u.nouveau}</span> Nouveau
                    </div>
                    <div className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-100 text-center">
                      <span className="font-bold block text-sm">{u.enCours}</span> En cours
                    </div>
                    <div className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 text-center">
                      <span className="font-bold block text-sm">{u.termine}</span> Terminé
                    </div>
                  </div>
                </div>
              ))}
              {sortedUsers.length === 0 && <div className="text-slate-400 italic text-center">Aucune donnée utilisateur</div>}
            </div>
          </div>

          {/* Top opportunités (Classement) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Top opportunités (Activité)
            </h3>
            <div className="space-y-3">
              {sortedUsers.map((u, index) => (
                <div key={u.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-600' : index === 1 ? 'bg-slate-200 text-slate-600' : index === 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.nouveau} nouveaux + {u.enCours} en cours</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 text-lg">{u.score}</div>
                    <div className="text-xs text-slate-500">Opportunités</div>
                  </div>
                </div>
              ))}
              {sortedUsers.length === 0 && <div className="text-slate-400 italic text-center">Aucun classement disponible</div>}
            </div>
          </div>
        </div>

        {/* Statistiques détaillées */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Statistiques détaillées</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-3xl font-bold text-blue-600 mb-1">{contacts.length}</div>
              <div className="text-sm text-slate-600">Contacts totaux</div>
              <div className="text-xs text-slate-500 mt-1">
                {contacts.filter(c => c.status === 'Client').length} clients actifs
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-3xl font-bold text-green-600 mb-1">{projects.length}</div>
              <div className="text-sm text-slate-600">Projets totaux</div>
              <div className="text-xs text-slate-500 mt-1">
                {projects.filter(p => p.status === 'En cours').length} en cours
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <div className="text-3xl font-bold text-orange-600 mb-1">{tasks.filter(t => !t.completed).length}</div>
              <div className="text-sm text-slate-600">Tâches en cours</div>
              <div className="text-xs text-slate-500 mt-1">
                {tasks.filter(t => t.completed).length} terminées
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Les modales sont maintenant rendues directement dans le JSX principal ou via des composants externes


  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" >
      {/* Sidebar */}
      < div className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col shadow-2xl" >
        {/* Logo */}
        < div className="p-6 border-b border-slate-700" >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            CRM Pro
          </h1>
          <p className="text-xs text-slate-400 mt-1">Gestion clients</p>
        </div >

        {/* Navigation */}
        < nav className="flex-1 p-4 space-y-1" >
          {
            navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
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
            <div className={`${currentUser.color} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden`}>
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                currentUser.avatar
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-400">{currentUser.role}</p>
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
      < div className="flex-1 overflow-y-auto" >
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {navItems.find(item => item.id === activeTab)?.label}
            </h1>
            <p className="text-slate-600">
              {activeTab === 'dashboard' && 'Vue d\'ensemble de votre activité'}
              {activeTab === 'contacts' && 'Gérez vos contacts et leurs projets'}

              {activeTab === 'tasks' && 'Organisez vos tâches quotidiennes'}
              {activeTab === 'calendar' && 'Planifiez vos rendez-vous'}
              {activeTab === 'reports' && 'Analysez vos performances'}
            </p>
          </div>

          {/* Content */}
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'contacts' && renderContacts()}
          {activeTab === 'projects' && renderProjects()}

          {activeTab === 'tasks' && renderTasks()}
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

      <UserSettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentUser={currentUser}
        onUpdate={handleUserUpdate}
      />
    </div >
  );
}