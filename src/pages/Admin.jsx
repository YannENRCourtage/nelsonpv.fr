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
import { Loader2, Trash2, Edit, Plus, Shield, ShieldAlert, Mail, Eye, EyeOff, Link } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ToggleSwitch } from '@/components/ui/toggle-switch';

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Repair form state
  const [repairData, setRepairData] = useState({ uid: '', email: '', firstName: '', lastName: '' });

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '', // Only for creation
    displayName: '',
    firstName: '',
    lastName: '',
    role: 'user',
    permissions: {
      canAccessCRM: false,
      canAccessEditor: false,
      canAccessSimulator: false,
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
        password: '', // Don't show password
        displayName: user.displayName || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role || 'user',
        permissions: {
          canAccessCRM: user.permissions?.canAccessCRM || false,
          canAccessEditor: user.permissions?.canAccessEditor || false,
          canAccessSimulator: user.permissions?.canAccessSimulator || false,
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
        permissions: {
          canAccessCRM: false,
          canAccessEditor: false,
          canAccessSimulator: false,
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
        // Update
        const updates = {
          displayName: formData.displayName,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          permissions: formData.permissions
        };
        // NOTE: Password update via client SDK for OTHER users is not strictly supported without Admin SDK.
        // We will pass it to API service in case we switch to backend, but usually it won't apply to Auth.
        // For now, we rely on recreating user if password lost.
        if (formData.password) {
          console.warn("Password update for existing user requested - requires Admin SDK or User Re-auth");
          // We could try to update if it's the CURRENT user, but for others it's tricky.
        }

        await apiService.updateUser(editingUser.id, updates);
        toast({ title: "Succès", description: "Utilisateur mis à jour." });
      } else {
        // Create
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

      toast({
        title: "Erreur de création",
        description: message,
        variant: "destructive",
        duration: 8000
      });
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
        permissions: {
          canAccessCRM: true,
          canAccessEditor: true,
          canAccessSimulator: true,
          canViewAllProjects: false
        },
        isActive: true, // Required for login
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

  const handleDelete = async (userId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.")) return;
    try {
      await apiService.deleteUser(userId);
      toast({ title: "Succès", description: "Utilisateur supprime." });
      fetchUsers();
    } catch (error) {
      console.error("Delete failed:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer l'utilisateur.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Double check admin role just in case
  if (currentUser?.role !== 'admin') {
    return <div className="p-8 text-center text-red-600">Accès non autorisé.</div>;
  }

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
        <div className="flex gap-2">
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
                    <div className="flex gap-2 flex-wrap">
                      {user.permissions?.canAccessCRM && (
                        <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">CRM</span>
                      )}
                      {user.permissions?.canAccessEditor && (
                        <span className="px-2 py-1 rounded bg-orange-50 text-orange-700 text-xs border border-orange-200">Éditeur</span>
                      )}
                      {user.permissions?.canAccessSimulator && (
                        <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs border border-green-200">Simulateur</span>
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
                        disabled={user.email === 'y.barberis@enr-courtage.fr'} // Protect main admin
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
                disabled={!!editingUser} // Prevent email change for now to avoid Auth desync
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{editingUser ? 'Nouveau mot de passe (Optionnel)' : 'Mot de passe'}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={editingUser ? "Laisser vide pour ne pas changer" : ""}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {editingUser && <p className="text-xs text-slate-500">Note: Pour changer le mot de passe d'un autre utilisateur, supprimez et recréez le compte si nécessaire.</p>}
            </div>

            <div className="space-y-3 border-t pt-3">
              <Label className="text-base">Permissions</Label>
              <div className="flex flex-col gap-3">
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
                  id="perm-simulator"
                  checked={formData.permissions.canAccessSimulator}
                  onCheckedChange={(c) => handlePermissionChange('canAccessSimulator', c)}
                  label="Accès Simulateur"
                />
                <ToggleSwitch
                  id="perm-viewall"
                  checked={formData.permissions.canViewAllProjects}
                  onCheckedChange={(c) => handlePermissionChange('canViewAllProjects', c)}
                  label="Voir TOUS les projets"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog >

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
    </div >
  );
}