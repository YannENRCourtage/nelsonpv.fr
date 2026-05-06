import React, { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Trash2, Edit, Plus, Shield, Mail, Eye, EyeOff, Link, FolderSync, Building2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { migrateCollectionToTenant, TENANTS, cleanupProjectActivities } from '@/services/firebase/firestore.service';

const TENANT_OPTIONS = [
  { value: 'green-invest', label: 'GREEN INVEST (BARCONNIERE)' },
  { value: 'acama', label: 'ACAMA' },
  { value: 'enr-courtage-energie', label: 'ENR COURTAGE ENERGIE' }
];

export default function Admin() {
  const { user: currentUser, activeTenantId, switchTenant, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [isMigratingOpen, setIsMigratingOpen] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Repair form state
  const [repairData, setRepairData] = useState({ uid: '', email: '', firstName: '', lastName: '' });

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    firstName: '',
    lastName: '',
    role: 'user',
    tenantId: 'green-invest',
    permissions: {
      canAccessCRM: false,
      canAccessEditor: false,
      canAccessSimulator: false,
      canAccessConfigurator: false,
      canAccessOdoo: false,
      canAccessCDP: false,
      canAccessFinance: false,
      canAccessBP: false,
      canAccessMonday: false,
      canAccessEnedis: false,
      canAccessDeveloppement: false,
      canAccessTracking: false,
      canViewAllProjects: false,
    }
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des utilisateurs.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email || '',
        password: '',
        displayName: user.displayName || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role || 'user',
        tenantId: user.tenantId || 'green-invest',
        permissions: {
          canAccessCRM: user.permissions?.canAccessCRM || false,
          canAccessEditor: user.permissions?.canAccessEditor || false,
          canAccessSimulator: user.permissions?.canAccessSimulator || false,
          canAccessConfigurator: user.permissions?.canAccessConfigurator || false,
          canAccessOdoo: user.permissions?.canAccessOdoo || false,
          canAccessCDP: user.permissions?.canAccessCDP || false,
          canAccessFinance: user.permissions?.canAccessFinance || false,
          canAccessBP: user.permissions?.canAccessBP || false,
          canAccessMonday: user.permissions?.canAccessMonday || false,
          canAccessEnedis: user.permissions?.canAccessEnedis || false,
          canAccessDeveloppement: user.permissions?.canAccessDeveloppement || false,
          canAccessTracking: user.permissions?.canAccessTracking || false,
          canViewAllProjects: user.permissions?.canViewAllProjects || false,
        }
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        displayName: '',
        firstName: '',
        lastName: '',
        role: 'user',
        tenantId: 'green-invest',
        permissions: {
          canAccessCRM: false,
          canAccessEditor: false,
          canAccessSimulator: false,
          canAccessConfigurator: false,
          canAccessOdoo: false,
          canAccessCDP: false,
          canAccessFinance: false,
          canAccessBP: false,
          canAccessMonday: false,
          canAccessEnedis: false,
          canAccessDeveloppement: false,
          canAccessTracking: false,
          canViewAllProjects: false,
        }
      });
    }
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRepairInputChange = (e) => {
    const { name, value } = e.target;
    setRepairData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (perm, checked) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [perm]: checked === true
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updates = {
          displayName: formData.displayName,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          tenantId: formData.tenantId,
          permissions: formData.permissions
        };
        await apiService.updateUser(editingUser.id, updates);
        toast({ title: "Succès", description: "Utilisateur mis à jour." });
      } else {
        if (!formData.email || !formData.password) {
          toast({ title: "Erreur", description: "Email et mot de passe requis.", variant: "destructive" });
          return;
        }
        await apiService.createUser(formData);
        toast({ title: "Succès", description: "Utilisateur créé." });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Operation failed:", error);
      let message = error.message || "Une erreur est survenue.";
      if (error.code === 'auth/email-already-in-use') {
        message = "ERREUR CRITIQUE : Cet email est déjà enregistré dans l'authentification Firebase mais n'a pas de profil. Impossible de le recréer ici. SOLUTION : Utilisez le bouton 'Lier UID' en haut à droite pour réparer ce compte.";
      }
      toast({ title: "Erreur de création", description: message, variant: "destructive", duration: 8000 });
    }
  };

  const handleRepairSubmit = async (e) => {
    e.preventDefault();
    if (!repairData.uid || !repairData.email) return;
    try {
      await setDoc(doc(db, 'users', repairData.uid), {
        email: repairData.email,
        displayName: `${repairData.firstName} ${repairData.lastName}`.trim() || repairData.email.split('@')[0],
        firstName: repairData.firstName,
        lastName: repairData.lastName,
        role: 'user',
        tenantId: 'green-invest',
        permissions: {
          canAccessCRM: true,
          canAccessEditor: true,
          canAccessSimulator: true,
          canViewAllProjects: false
        },
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast({ title: "Réparation réussie", description: "Profil utilisateur recréé manuellement." });
      setIsRepairModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Échec de la réparation manuelle.", variant: "destructive" });
    }
  };

  const handleMigrateToGreenInvest = async () => {
    if (!window.confirm(
      "Cela va assigner tenantId='green-invest' à TOUS les projets, contacts et tâches qui n'ont pas encore de tenant.\n\nCette action est sûre et ne modifie pas les données existantes, elle ne fait qu'ajouter le champ tenant. Continuer ?"
    )) return;
    setMigrationLoading(true);
    try {
      const [projects, contacts, tasks, activities, simulations] = await Promise.all([
        migrateCollectionToTenant('projects', 'green-invest'),
        migrateCollectionToTenant('contacts', 'green-invest'),
        migrateCollectionToTenant('tasks', 'green-invest'),
        migrateCollectionToTenant('activities', 'green-invest'),
        migrateCollectionToTenant('financial_simulations', 'green-invest'),
      ]);
      toast({
        title: "Migration réussie ✅",
        description: `Projets: ${projects}, Contacts: ${contacts}, Tâches: ${tasks}, Activités: ${activities}, Simulations: ${simulations} documents migrés vers GREEN INVEST.`
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur de migration", description: err.message, variant: "destructive" });
    } finally {
      setMigrationLoading(false);
      setIsMigratingOpen(false);
    }
  };

  const handleDelete = async (uid) => {
    if (!window.confirm("Supprimer cet utilisateur ? (Le compte Auth Firebase restera actif, seul le profil Firestore sera supprimé)")) return;
    try {
      await apiService.deleteUser(uid);
      toast({ title: "Succès", description: "Utilisateur supprimé." });
      fetchUsers();
    } catch (error) {
      console.error("Delete failed:", error);
      toast({ title: "Erreur", description: "Échec de la suppression.", variant: "destructive" });
    }
  };

  const handleInitOdooStages = async () => {
    if (!window.confirm("Cela va réinitialiser les colonnes ODOO pour TOUS les utilisateurs. Continuer ?")) return;
    try {
      const stages = [
        "Montage Administratif",
        "Réaliser la DP/PC",
        "Récupérer l'ARE",
        "Récupérer l'accord ou refus Mairie",
        "Déposer la demande sur le portail ENEDIS",
        "Récupérer l'accord ou refus ENEDIS",
        "Mandater l'huissier",
        "Mandater le Géomètre",
        "Mandater le Notaire"
      ];
      await setDoc(doc(db, 'config', 'odooStages'), {
        stages: stages,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Succès", description: "Étapes ODOO réinitialisées et synchronisées !" });
    } catch (error) {
      console.error("Init ODOO failed:", error);
      toast({ title: "Erreur", description: "Échec de l'initialisation ODOO : " + error.message, variant: "destructive" });
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    return <div className="p-8 text-center text-red-600">Accès non autorisé.</div>;
  }

  const tenantLabel = TENANT_OPTIONS.find(t => t.value === activeTenantId)?.label || activeTenantId;

  return (
    <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            Administration
          </h1>
          <p className="text-slate-500 mt-1">Gérez les utilisateurs et leurs accès</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button onClick={() => setIsMigratingOpen(true)} variant="outline" className="text-green-700 border-green-300 hover:bg-green-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Migration Tenant
          </Button>
          <Button onClick={handleInitOdooStages} variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">
            <FolderSync className="w-4 h-4 mr-2" />
            Réinit. ODOO
          </Button>
          <Button onClick={() => setIsRepairModalOpen(true)} variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50">
            <Link className="w-4 h-4 mr-2" />
            Lier UID Existant
          </Button>
          <Button onClick={() => handleOpenModal(null)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nouvel utilisateur
          </Button>
        </div>
      </div>

      {/* TENANT SWITCHER (Admin only) */}
      <Card className="border-2 border-blue-100 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-blue-800">
            <Building2 className="w-5 h-5" />
            Interface active : <span className="font-bold">{tenantLabel}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-3">
            En tant qu'administrateur, vous pouvez basculer entre les interfaces entreprise. Cette sélection s'applique à toute l'application.
          </p>
          <div className="flex gap-3">
            {TENANT_OPTIONS.map(t => (
              <button
                key={t.value}
                onClick={() => switchTenant(t.value)}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${activeTenantId === t.value
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                  : 'bg-white border-slate-300 text-slate-700 hover:border-blue-400'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Accès</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">
                        {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.displayName}
                      </span>
                      <span className="text-sm text-slate-500">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-green-100 text-green-800'
                      }`}>
                      {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.tenantId === 'acama' ? 'bg-blue-100 text-blue-800' :
                      user.tenantId === 'green-invest' ? 'bg-green-100 text-green-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                      {TENANT_OPTIONS.find(t => t.value === user.tenantId)?.label || user.tenantId || 'GREEN INVEST (défaut)'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {user.permissions?.canAccessCRM && (
                        <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">CRM</span>
                      )}
                      {user.permissions?.canAccessEditor && (
                        <span className="px-2 py-1 rounded bg-orange-50 text-orange-700 text-xs border border-orange-200">Éditeur</span>
                      )}
                      {user.permissions?.canAccessConfigurator && (
                        <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs border border-indigo-200">Config</span>
                      )}
                      {user.permissions?.canAccessOdoo && (
                        <span className="px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs border border-purple-200">Odoo</span>
                      )}
                      {user.permissions?.canAccessCDP && (
                        <span className="px-2 py-1 rounded bg-yellow-50 text-yellow-700 text-xs border border-yellow-200">CDP</span>
                      )}
                      {user.permissions?.canAccessBP && (
                        <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs border border-green-200">BP</span>
                      )}
                      {user.permissions?.canAccessMonday && (
                        <span className="px-2 py-1 rounded bg-pink-50 text-pink-700 text-xs border border-pink-200">Monday</span>
                      )}
                      {user.permissions?.canAccessEnedis && (
                        <span className="px-2 py-1 rounded bg-cyan-50 text-cyan-700 text-xs border border-cyan-200">ENEDIS</span>
                      )}
                      {user.permissions?.canAccessDeveloppement && (
                        <span className="px-2 py-1 rounded bg-violet-50 text-violet-700 text-xs border border-violet-200">Dév.</span>
                      )}
                      {user.permissions?.canAccessTracking && (
                        <span className="px-2 py-1 rounded bg-amber-50 text-amber-700 text-xs border border-amber-200">Suivi</span>
                      )}
                      {user.permissions?.canAccessSimulator && (
                        <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">Simulateur</span>
                      )}
                      {user.permissions?.canAccessFinance && (
                        <span className="px-2 py-1 rounded bg-teal-50 text-teal-700 text-xs border border-teal-200">Finance</span>
                      )}
                      {user.permissions?.canViewAllProjects && (
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs border border-slate-200">Tout voir</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenModal(user)}>
                        <Edit className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(user.id)}
                        disabled={user.email === 'y.barberis@enr-courtage.fr'}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE / EDIT USER MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Nom d'affichage (ex: Pseudo)</Label>
              <Input id="displayName" name="displayName" value={formData.displayName} onChange={handleInputChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!!editingUser}
              />
            </div>

            {/* Password Field - NEW behavior: Allow direct change for admins */}
            {editingUser ? (
              <div className="space-y-2 border-t pt-3">
                <Label htmlFor="password">Changer le mot de passe (Admin)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Nouveau mot de passe"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 h-4 text-slate-400" /> : <Eye className="h-4 h-4 text-slate-400" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    disabled={!formData.password || formData.password.length < 6}
                    onClick={async () => {
                      if (!window.confirm(`Changer le mot de passe de ${editingUser.displayName || editingUser.email} ?`)) return;
                      try {
                        await apiService.changeUserPassword(editingUser.id, formData.password);
                        toast({ title: "Succès", description: "Mot de passe mis à jour !" });
                        setFormData(prev => ({ ...prev, password: '' }));
                      } catch (err) {
                        toast({ title: "Erreur", description: err.message, variant: "destructive" });
                      }
                    }}
                  >
                    Mettre à jour
                  </Button>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded text-xs text-slate-500">
                  <span>Ou envoyer un lien par email :</span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={async () => {
                      try {
                        await apiService.sendPasswordReset(formData.email);
                        toast({ title: "Email envoyé", description: `Un lien a été envoyé à ${formData.email}` });
                      } catch (err) {
                        toast({ title: "Erreur", description: err.message, variant: "destructive" });
                      }
                    }}
                  >
                    Envoyer lien reset
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingUser}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 h-4 text-slate-400" /> : <Eye className="h-4 h-4 text-slate-400" />}
                  </Button>
                </div>
              </div>
            )}
            {/* TENANT SELECTOR */}
            <div className="space-y-2 border-t pt-3">
              <Label htmlFor="tenantId" className="flex items-center gap-1">
                <Building2 className="w-4 h-4" /> Entreprise (Interface)
              </Label>
              <select
                id="tenantId"
                name="tenantId"
                value={formData.tenantId}
                onChange={handleInputChange}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TENANT_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500">L'utilisateur ne verra que les projets et contacts de cette entreprise.</p>
            </div>

            <div className="space-y-3 border-t pt-3">
              <Label className="text-base">Permissions</Label>
              <div className="flex flex-col gap-3" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: 4 }}>
                <ToggleSwitch
                  id="perm-crm"
                  checked={formData.permissions.canAccessCRM}
                  onCheckedChange={(c) => handlePermissionChange('canAccessCRM', c)}
                  label="Accès CRM"
                />
                <ToggleSwitch
                  id="perm-editor"
                  checked={formData.permissions.canAccessEditor}
                  onCheckedChange={(c) => handlePermissionChange('canAccessEditor', c)}
                  label="Accès Éditeur"
                />
                <ToggleSwitch
                  id="perm-configurator"
                  checked={formData.permissions.canAccessConfigurator}
                  onCheckedChange={(c) => handlePermissionChange('canAccessConfigurator', c)}
                  label="Accès Configurateur"
                />
                <ToggleSwitch
                  id="perm-odoo"
                  checked={formData.permissions.canAccessOdoo}
                  onCheckedChange={(c) => handlePermissionChange('canAccessOdoo', c)}
                  label="Accès ODOO"
                />
                <ToggleSwitch
                  id="perm-cdp"
                  checked={formData.permissions.canAccessCDP}
                  onCheckedChange={(c) => handlePermissionChange('canAccessCDP', c)}
                  label="Accès CDP"
                />
                <ToggleSwitch
                  id="perm-bp"
                  checked={formData.permissions.canAccessBP}
                  onCheckedChange={(c) => handlePermissionChange('canAccessBP', c)}
                  label="Accès BP"
                />
                <ToggleSwitch
                  id="perm-monday"
                  checked={formData.permissions.canAccessMonday}
                  onCheckedChange={(c) => handlePermissionChange('canAccessMonday', c)}
                  label="Accès Monday"
                />
                <ToggleSwitch
                  id="perm-enedis"
                  checked={formData.permissions.canAccessEnedis}
                  onCheckedChange={(c) => handlePermissionChange('canAccessEnedis', c)}
                  label="Accès ENEDIS"
                />
                <ToggleSwitch
                  id="perm-developpement"
                  checked={formData.permissions.canAccessDeveloppement}
                  onCheckedChange={(c) => handlePermissionChange('canAccessDeveloppement', c)}
                  label="Accès Développement"
                />
                <ToggleSwitch
                  id="perm-tracking"
                  checked={formData.permissions.canAccessTracking}
                  onCheckedChange={(c) => handlePermissionChange('canAccessTracking', c)}
                  label="Accès Suivi dossiers"
                />
                <ToggleSwitch
                  id="perm-simulator"
                  checked={formData.permissions.canAccessSimulator}
                  onCheckedChange={(c) => handlePermissionChange('canAccessSimulator', c)}
                  label="Accès Simulateur"
                />
                <ToggleSwitch
                  id="perm-finance"
                  checked={formData.permissions.canAccessFinance}
                  onCheckedChange={(c) => handlePermissionChange('canAccessFinance', c)}
                  label="Accès Finance"
                />
                <ToggleSwitch
                  id="perm-viewall"
                  checked={formData.permissions.canViewAllProjects}
                  onCheckedChange={(c) => handlePermissionChange('canViewAllProjects', c)}
                  label="Voir TOUS les projets (du tenant)"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* REPAIR MODAL */}
      <Dialog open={isRepairModalOpen} onOpenChange={setIsRepairModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Lier un UID Firebase Existant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRepairSubmit} className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800 mb-4">
              Utilisez cette fonction si un utilisateur existe dans "Authentication" mais n'apparaît pas ici.
              Copiez l'UID depuis la console Firebase.
            </div>
            <div className="space-y-2">
              <Label htmlFor="repair-uid">UID Firebase (Requis)</Label>
              <Input id="repair-uid" name="uid" value={repairData.uid} onChange={handleRepairInputChange} placeholder="ex: dDQCOfuf6OcQ8WzeojrPezLlkHe2" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repair-email">Email (Requis)</Label>
              <Input id="repair-email" name="email" value={repairData.email} onChange={handleRepairInputChange} placeholder="ex: elodie@exemple.com" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input name="firstName" value={repairData.firstName} onChange={handleRepairInputChange} />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input name="lastName" value={repairData.lastName} onChange={handleRepairInputChange} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRepairModalOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">Réparer / Créer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MIGRATION MODAL */}
      <Dialog open={isMigratingOpen} onOpenChange={setIsMigratingOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-600" />
              Migration des données existantes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-green-50 border border-green-200 rounded text-sm text-green-900">
              <strong>À effectuer une seule fois</strong> lors de la mise en place du système multi-tenant.<br /><br />
              Cette action va assigner <code className="bg-green-100 px-1 rounded">tenantId = "green-invest"</code> à tous les projets, contacts et tâches qui n'ont pas encore de tenant assigné.<br /><br />
              Les données déjà migrées ne seront pas modifiées.
            </div>
            <div className="p-4 bg-slate-100 border border-slate-200 rounded text-sm text-slate-700">
              Les nouvelles données créées après cette migration auront automatiquement le bon tenant.
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsMigratingOpen(false)}>Annuler</Button>
            <Button
              onClick={handleMigrateToGreenInvest}
              disabled={migrationLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {migrationLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Migration en cours...</> : 'Lancer la migration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}