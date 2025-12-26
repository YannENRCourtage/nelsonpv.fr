import React, { useState } from 'react';
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
  List, LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

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
  // État pour gérer l'onglet actif
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState('list'); // 'card' | 'list' - Default to list as requested
  const [taskViewMode, setTaskViewMode] = useState('list'); // Default to list for tasks as requested


  // Utilisation du vrai contexte utilisateur au lieu de données mockées
  const { user } = useAuth();
  const currentUser = {
    name: user?.displayName || 'Utilisateur',
    role: user?.role === 'admin' ? 'Administrateur' : 'Utilisateur',
    avatar: user?.firstName ? user.firstName.substring(0, 2).toUpperCase() : 'ME',
    color: 'bg-gradient-to-br from-blue-500 to-purple-600'
  };

  // Fetch contacts from API
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Fetch contacts from API on mount
  React.useEffect(() => {
    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const apiContacts = await apiService.getContacts();
        setContacts(apiContacts || []);
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
        // Fallback to empty array if API fails
        setContacts([]);
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchContacts();
  }, []);

  // Refresh contacts when projects are updated
  React.useEffect(() => {
    const handleProjectsUpdated = async () => {
      try {
        const apiContacts = await apiService.getContacts();
        setContacts(apiContacts || []);
      } catch (error) {
        console.error('Failed to refresh contacts:', error);
      }
    };

    window.addEventListener('projectsUpdated', handleProjectsUpdated);
    return () => window.removeEventListener('projectsUpdated', handleProjectsUpdated);
  }, []);




  // État pour gérer les opportunités (nécessaire pour les rapports même si l'onglet est masqué)
  const [opportunities, setOpportunities] = useState([
    {
      id: 1,
      name: 'Installation PV 250kWc',
      company: 'Solar Corp',
      contact: 'Jean Solaire',
      amount: 185000,
      probability: 75,
      status: 'Négociation',
      closeDate: '2025-12-15',
      color: 'bg-green-500'
    },
    {
      id: 2,
      name: 'Audit énergétique',
      company: 'Eco Bâtiment',
      contact: 'Marie Vert',
      amount: 12000,
      probability: 50,
      status: 'Qualification',
      closeDate: '2025-11-30',
      color: 'bg-yellow-500'
    },
    {
      id: 3,
      name: 'Rénovation toiture + PV',
      company: 'Futur Energie',
      contact: 'Paul Avenir',
      amount: 95000,
      probability: 30,
      status: 'Prospection',
      closeDate: '2026-01-20',
      color: 'bg-blue-500'
    },
  ]);

  // État pour gérer les tâches
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Appel de suivi Solar Corp',
      contact: 'Jean Solaire',
      dueDate: '2025-11-22',
      priority: 'Haute',
      completed: false,
      color: 'bg-red-500'
    },
    {
      id: 2,
      title: 'Envoyer devis Eco Bâtiment',
      contact: 'Marie Vert',
      dueDate: '2025-11-23',
      priority: 'Moyenne',
      completed: false,
      color: 'bg-orange-500'
    },
    {
      id: 3,
      title: 'Réunion technique Futur Energie',
      contact: 'Paul Avenir',
      dueDate: '2025-11-25',
      priority: 'Basse',
      completed: true,
      color: 'bg-green-500'
    },
  ]);

  // États pour les modales et formulaires
  const [showContactModal, setShowContactModal] = useState(false);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [editingOpportunity, setEditingOpportunity] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Données KPI pour le dashboard
  const kpis = [
    {
      icon: Users,
      label: 'Contacts',
      value: contacts.length.toString(),
      trend: '+12%',
      trendPositive: true,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50'
    },
    {
      icon: FolderHeart,
      label: 'Projets en cours',
      value: projects.filter(p => p.status === 'En cours').length.toString(),
      trend: '+15%',
      trendPositive: true,
      color: 'bg-green-500',
      bgLight: 'bg-green-50'
    },
    {
      icon: CheckSquare,
      label: 'Tâches en cours',
      value: tasks.filter(t => !t.completed).length.toString(),
      trend: '5%',
      trendPositive: false,
      color: 'bg-orange-500',
      bgLight: 'bg-orange-50'
    },
    {
      icon: CheckCircle2,
      label: 'Projets terminés',
      value: projects.filter(p => p.status === 'terminé' || p.status === 'Terminé').length.toString(),
      trend: '+23%',
      trendPositive: true,
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50'
    },
  ];

  // Activités récentes
  const recentActivities = [
    {
      id: 1,
      name: 'Vous',
      action: 'avez ajouté un contact',
      target: contacts[contacts.length - 1]?.name || 'Nouveau contact',
      time: 'Il y a 2h',
      avatar: currentUser.avatar,
      color: currentUser.color
    },
    {
      id: 2,
      name: 'Système',
      action: 'mise à jour système',
      target: 'Maintenance',
      time: 'Il y a 3h',
      avatar: 'S',
      color: 'bg-green-500'
    },
    {
      id: 3,
      name: 'Vous',
      action: 'avez complété une tâche',
      target: tasks.find(t => t.completed)?.title || 'Tâche',
      time: 'Il y a 5h',
      avatar: currentUser.avatar,
      color: 'bg-pink-500'
    },
  ];

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'projects', label: 'Projets', icon: FolderHeart },
    { id: 'tasks', label: 'Tâches', icon: CheckSquare },
    { id: 'calendar', label: 'Calendrier', icon: Calendar },
    { id: 'reports', label: 'Rapports', icon: FileText },
  ];

  // Fonctions de gestion des contacts
  const handleAddContact = () => {
    setEditingContact({
      id: Date.now(),
      name: '',
      company: '',
      email: '',
      phone: '',
      city: '',
      status: 'Prospect',
      color: 'bg-blue-500',
      projects: []
    });
    setShowContactModal(true);
  };

  const handleEditContact = (contact) => {
    setEditingContact({ ...contact });
    setShowContactModal(true);
  };

  const handleSaveContact = async () => {
    try {
      if (editingContact.id && contacts.find(c => c.id === editingContact.id)) {
        // Update existing contact
        await apiService.updateContact(editingContact.id, editingContact);
        setContacts(contacts.map(c => c.id === editingContact.id ? editingContact : c));
      } else {
        // Create new contact
        const newContact = await apiService.createContact(editingContact);
        setContacts([...contacts, newContact]);
      }
      setShowContactModal(false);
      setEditingContact(null);
    } catch (error) {
      console.error('Failed to save contact:', error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder le contact.", variant: "destructive" });
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) return;
    try {
      await apiService.deleteContact(id);
      setContacts(contacts.filter(c => c.id !== id));
      toast({ title: "Succès", description: "Contact supprimé." });
    } catch (error) {
      console.error('Failed to delete contact:', error);
      toast({ title: "Erreur", description: "Impossible de supprimer le contact.", variant: "destructive" });
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce projet ?")) return;
    try {
      // Delete from Firebase first
      await apiService.deleteProject(projectId);

      // Update context state - context will handle localStorage via setProjects
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);

      toast({ title: "Succès", description: "Projet supprimé." });
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast({ title: "Erreur", description: "Impossible de supprimer le projet.", variant: "destructive" });
    }
  };

  const handleGeneratePDF = async (projectId) => {
    try {
      const projectData = await apiService.getProject(projectId);
      if (!projectData) {
        toast({ title: "Erreur", description: "Projet introuvable.", variant: "destructive" });
        return;
      }

      await generatePdfForProject(projectData);
      toast({ title: "Succès", description: "PDF généré et téléchargé." });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: "Erreur", description: "Impossible de générer le PDF.", variant: "destructive" });
    }
  };



  // Fonctions de gestion des tâches
  const handleAddTask = () => {
    setEditingTask({
      id: Date.now(),
      title: '',
      contact: '',
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'Moyenne',
      completed: false,
      color: 'bg-orange-500'
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = () => {
    if (editingTask.id && tasks.find(t => t.id === editingTask.id)) {
      setTasks(tasks.map(t => t.id === editingTask.id ? editingTask : t));
    } else {
      setTasks([...tasks, editingTask]);
    }
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const toggleTaskComplete = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // Filtrer les contacts par recherche
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Rendu du Dashboard
  const renderDashboard = () => (
    <>
      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${kpi.bgLight} p-3 rounded-xl`}>
                  <Icon className={`w-6 h-6 ${kpi.color.replace('bg-', 'text-')}`} />
                </div>
                <span
                  className={`text-sm font-semibold px-2 py-1 rounded-full ${kpi.trendPositive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                    }`}
                >
                  {kpi.trend}
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 mb-1">{kpi.value}</p>
                <p className="text-sm text-slate-600">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nouveaux projets */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Nouveaux projets</h2>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
            >
              Voir tout
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="space-y-5">
            {[...projects]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 3)
              .map((project) => (
                <div key={project.id} className="group hover:bg-slate-50 rounded-xl p-4 transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">{project.name || 'Sans nom'}</h3>
                      <p className="text-sm text-slate-600">{project.city || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">{project.type || 'Construction'}</p>
                      <p className="text-xs text-slate-500">{project.createdAt ? new Date(project.createdAt).toLocaleDateString('fr-FR') : '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className={`px-2 py-1 rounded-full ${project.status === 'terminé' || project.status === 'Terminé' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {project.status || 'En cours'}
                    </span>
                    <span>• {project.user || '-'}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Activités récentes */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Activités récentes</h2>

        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 group hover:bg-slate-50 rounded-lg p-3 transition-all duration-200">
              <div className={`${activity.color} w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
                {activity.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900">
                  <span className="font-semibold">{activity.name}</span>{' '}
                  <span className="text-slate-600">{activity.action}</span>
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1 truncate">{activity.target}</p>
                <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
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
                      <Button variant="ghost" size="icon" onClick={() => { setEditingTask(task); setShowTaskModal(true); }}>
                        <Edit className="w-4 h-4 text-slate-500" />
                      </Button>
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
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
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

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

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
    const totalRevenue = opportunities.reduce((sum, opp) => sum + opp.amount, 0);
    const avgDealSize = totalRevenue / opportunities.length;
    const winRate = (opportunities.filter(o => o.status === 'Négociation').length / opportunities.length * 100).toFixed(0);
    const completionRate = (tasks.filter(t => t.completed).length / tasks.length * 100).toFixed(0);

    const statusDistribution = [
      { name: 'Prospection', count: opportunities.filter(o => o.status === 'Prospection').length, color: 'bg-blue-500' },
      { name: 'Qualification', count: opportunities.filter(o => o.status === 'Qualification').length, color: 'bg-yellow-500' },
      { name: 'Négociation', count: opportunities.filter(o => o.status === 'Négociation').length, color: 'bg-green-500' },
    ];

    const maxCount = Math.max(...statusDistribution.map(s => s.count), 1);

    return (
      <div className="space-y-6">
        {/* KPIs Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Euro className="w-8 h-8 opacity-80" />
              <Activity className="w-6 h-6 opacity-60" />
            </div>
            <div className="text-3xl font-bold">{(totalRevenue / 1000).toFixed(0)}K€</div>
            <div className="text-blue-100 text-sm mt-1">Revenu total pipeline</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 opacity-80" />
              <BarChart3 className="w-6 h-6 opacity-60" />
            </div>
            <div className="text-3xl font-bold">{(avgDealSize / 1000).toFixed(0)}K€</div>
            <div className="text-green-100 text-sm mt-1">Taille moyenne des deals</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <PieChart className="w-8 h-8 opacity-80" />
              <CheckCircle2 className="w-6 h-6 opacity-60" />
            </div>
            <div className="text-3xl font-bold">{winRate}%</div>
            <div className="text-purple-100 text-sm mt-1">Taux de conversion</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckSquare className="w-8 h-8 opacity-80" />
              <Activity className="w-6 h-6 opacity-60" />
            </div>
            <div className="text-3xl font-bold">{completionRate}%</div>
            <div className="text-orange-100 text-sm mt-1">Tâches complétées</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribution par statut */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Distribution des opportunités
            </h3>
            <div className="space-y-4">
              {statusDistribution.map((status) => (
                <div key={status.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{status.name}</span>
                    <span className="text-sm font-bold text-slate-900">{status.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full ${status.color} rounded-full transition-all duration-500`}
                      style={{ width: `${(status.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Opportunités */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Top opportunités
            </h3>
            <div className="space-y-3">
              {opportunities
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map((opp) => (
                  <div key={opp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 text-sm">{opp.name}</div>
                      <div className="text-xs text-slate-600">{opp.company}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{(opp.amount / 1000).toFixed(0)}K€</div>
                      <div className={`text-xs px-2 py-0.5 rounded-full ${opp.color} bg-opacity-20 ${opp.color.replace('bg-', 'text-')}`}>
                        {opp.probability}%
                      </div>
                    </div>
                  </div>
                ))}
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
              <div className="text-3xl font-bold text-green-600 mb-1">{opportunities.length}</div>
              <div className="text-sm text-slate-600">Opportunités actives</div>
              <div className="text-xs text-slate-500 mt-1">
                Pipeline de {(totalRevenue / 1000).toFixed(0)}K€
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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col shadow-2xl">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            CRM Pro
          </h1>
          <p className="text-xs text-slate-400 mt-1">Gestion clients</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
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
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/50">
            <div className={`${currentUser.color} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold`}>
              {currentUser.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-400">{currentUser.role}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="flex-1 p-2 hover:bg-slate-700/50 rounded-lg transition-colors" title="Paramètres">
              <Settings className="w-4 h-4 mx-auto text-slate-400" />
            </button>
            <button className="flex-1 p-2 hover:bg-red-500/10 rounded-lg transition-colors" title="Déconnexion">
              <LogOut className="w-4 h-4 mx-auto text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
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
      </div>

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
    </div>
  );
}