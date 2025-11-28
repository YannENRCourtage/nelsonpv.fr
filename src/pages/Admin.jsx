import React, { useState, useEffect } from 'react';
import apiService from '../services/api.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { toast } from "@/components/ui/use-toast.js";
import {
  Users, Plus, Edit, Trash2, Key, Mail, Phone, User,
  Shield, Lock, Search, X, AlertCircle, CheckCircle2
} from 'lucide-react';

const toastStyle = { className: "bg-white text-gray-900 p-4 border border-gray-300 rounded-lg shadow-lg" };

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordUserId, setPasswordUserId] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'user',
    pageAccess: { crm: true, monday: false, administration: false }
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Charger les utilisateurs
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        ...toastStyle,
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: 'user',
      pageAccess: { crm: true, monday: false, administration: false }
    });
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '', // Ne pas afficher le mot de passe
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      role: user.role,
      pageAccess: typeof user.pageAccess === 'object'
        ? user.pageAccess
        : JSON.parse(user.pageAccess || '{"crm":true,"monday":false,"administration":false}')
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    // Validation
    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast({
        ...toastStyle,
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive"
      });
      return;
    }

    if (!editingUser && !formData.password) {
      toast({
        ...toastStyle,
        title: "Erreur",
        description: "Le mot de passe est requis pour un nouvel utilisateur",
        variant: "destructive"
      });
      return;
    }

    if (!editingUser && formData.password.length < 6) {
      toast({
        ...toastStyle,
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingUser) {
        // Mise à jour (sans mot de passe)
        const { password, ...updateData } = formData;
        await apiService.updateUser(editingUser.id, updateData);
        toast({
          ...toastStyle,
          title: "Succès",
          description: "Utilisateur mis à jour avec succès"
        });
      } else {
        // Création
        await apiService.createUser(formData);
        toast({
          ...toastStyle,
          title: "Succès",
          description: "Utilisateur créé avec succès"
        });
      }

      setShowUserModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        ...toastStyle,
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder l'utilisateur",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    try {
      await apiService.deleteUser(userId);
      toast({
        ...toastStyle,
        title: "Succès",
        description: "Utilisateur supprimé avec succès"
      });
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        ...toastStyle,
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur",
        variant: "destructive"
      });
    }
  };

  const handleChangePassword = (userId) => {
    setPasswordUserId(userId);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        ...toastStyle,
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        ...toastStyle,
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive"
      });
      return;
    }

    try {
      await apiService.updateUserPassword(passwordUserId, newPassword);
      toast({
        ...toastStyle,
        title: "Succès",
        description: "Mot de passe modifié avec succès"
      });
      setShowPasswordModal(false);
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        ...toastStyle,
        title: "Erreur",
        description: "Impossible de modifier le mot de passe",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Administration</h1>
          </div>
          <p className="text-slate-600">Gérez les utilisateurs, leurs rôles et leurs droits d'accès</p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher un utilisateur..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAddUser}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvel utilisateur
            </Button>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p>Chargement...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Aucun utilisateur trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Utilisateur</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Téléphone</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Rôle</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase">Droits d'accès</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const access = typeof user.pageAccess === 'object'
                      ? user.pageAccess
                      : JSON.parse(user.pageAccess || '{}');

                    return (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                              {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{user.firstName} {user.lastName}</div>
                              <div className="text-sm text-slate-500">ID: {user.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {user.phone || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                            }`}>
                            {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {access.crm && (
                              <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">CRM</span>
                            )}
                            {access.monday && (
                              <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-medium">Monday</span>
                            )}
                            {access.administration && (
                              <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium">Admin</span>
                            )}
                            {!access.crm && !access.monday && !access.administration && (
                              <span className="text-slate-400 text-xs">Aucun</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleChangePassword(user.id)}
                              className="hover:bg-purple-50"
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="hover:bg-red-50 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Modal */}
        <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jean.dupont@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Téléphone
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="06 12 34 56 78"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 6 caractères"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Rôle</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="user">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Droits d'accès</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <Checkbox
                      checked={formData.pageAccess.crm}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        pageAccess: { ...formData.pageAccess, crm: !!checked }
                      })}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">CRM</div>
                      <div className="text-sm text-slate-500">Accès au module CRM</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <Checkbox
                      checked={formData.pageAccess.monday}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        pageAccess: { ...formData.pageAccess, monday: !!checked }
                      })}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">Monday</div>
                      <div className="text-sm text-slate-500">Accès au module Monday</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <Checkbox
                      checked={formData.pageAccess.administration}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        pageAccess: { ...formData.pageAccess, administration: !!checked }
                      })}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">Administration</div>
                      <div className="text-sm text-slate-500">Accès à la gestion des utilisateurs</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setShowUserModal(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveUser} className="bg-blue-600 hover:bg-blue-700">
                {editingUser ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Modal */}
        <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le mot de passe</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nouveau mot de passe
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez le mot de passe"
                />
              </div>

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Les mots de passe ne correspondent pas
                </div>
              )}

              {newPassword && newPassword.length < 6 && (
                <div className="flex items-center gap-2 text-orange-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Le mot de passe doit contenir au moins 6 caractères
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
                Annuler
              </Button>
              <Button onClick={handleSavePassword} className="bg-purple-600 hover:bg-purple-700">
                <Key className="w-4 h-4 mr-2" />
                Modifier le mot de passe
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}