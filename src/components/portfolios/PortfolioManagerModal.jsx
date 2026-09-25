import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePortfolios } from '@/contexts/PortfolioContext';
import { useToast } from '@/components/ui/use-toast';
import {
  FolderPlus,
  Briefcase,
  Layers,
  Sun,
  BatteryCharging,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Plus
} from 'lucide-react';

import { normalizePortfolioName, getProjectPvPortfolio } from '@/data/pvPortfolioData.js';

export default function PortfolioManagerModal({ open, onClose, projects = [] }) {
  const { portfolios, canManagePortfolios, createPortfolio, updatePortfolio, deletePortfolio, loading } = usePortfolios();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'PV' | 'BESS' | 'HYBRIDE'
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Formulaire d'ajout
  const [formData, setFormData] = useState({
    name: '',
    type: 'PV',
    spv: '',
    description: ''
  });

  // Formulaire d'édition
  const [editData, setEditData] = useState({
    name: '',
    type: 'PV',
    spv: '',
    description: ''
  });

  // Calcul du nombre de projets CRM rattachés à chaque portefeuille
  const projectCounts = useMemo(() => {
    const counts = {};
    (projects || []).forEach(p => {
      const pvPort = normalizePortfolioName(getProjectPvPortfolio(p));
      if (pvPort) {
        counts[pvPort] = (counts[pvPort] || 0) + 1;
      }
      const bessPort = normalizePortfolioName(p.bess_portfolio || p.portfolio_bess || p.bessPortfolio || p.data?.bess_portfolio || '');
      if (bessPort) {
        counts[bessPort] = (counts[bessPort] || 0) + 1;
      }
    });
    return counts;
  }, [projects]);

  const filteredPortfolios = useMemo(() => {
    const list = (portfolios || []).filter(p => (p.name || '').toUpperCase() !== 'ACAMA');
    if (activeTab === 'ALL') return list;
    return list.filter(p => p.type === activeTab);
  }, [portfolios, activeTab]);

  const handleStartCreate = (defaultType = 'PV') => {
    setFormData({
      name: '',
      type: defaultType,
      spv: '',
      description: ''
    });
    setEditingId(null);
    setIsCreating(true);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setFormData({ name: '', type: 'PV', spv: '', description: '' });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Nom obligatoire",
        description: "Veuillez renseigner le nom du portefeuille.",
        variant: "destructive"
      });
      return;
    }

    try {
      const created = await createPortfolio({
        name: formData.name,
        type: formData.type,
        spv: formData.spv || `${formData.name.trim().toUpperCase()} SPV 1`,
        description: formData.description
      });

      toast({
        title: "Portefeuille créé avec succès",
        description: `Le portefeuille ${created.name} (${created.type}) est maintenant disponible pour tous les utilisateurs.`
      });

      setIsCreating(false);
      setFormData({ name: '', type: 'PV', spv: '', description: '' });
    } catch (err) {
      toast({
        title: "Erreur lors de la création",
        description: err.message || "Une erreur est survenue.",
        variant: "destructive"
      });
    }
  };

  const handleStartEdit = (port) => {
    setIsCreating(false);
    setEditingId(port.id);
    setEditData({
      name: port.name,
      type: port.type,
      spv: port.spv || '',
      description: port.description || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleEditSubmit = async (e, id) => {
    e.preventDefault();
    if (!editData.name.trim()) {
      toast({
        title: "Nom obligatoire",
        description: "Veuillez renseigner le nom du portefeuille.",
        variant: "destructive"
      });
      return;
    }

    try {
      const updated = await updatePortfolio(id, {
        name: editData.name,
        type: editData.type,
        spv: editData.spv,
        description: editData.description
      });

      toast({
        title: "Portefeuille mis à jour",
        description: `Les informations du portefeuille ${updated.name} ont été enregistrées.`
      });

      setEditingId(null);
    } catch (err) {
      toast({
        title: "Erreur lors de la modification",
        description: err.message || "Une erreur est survenue.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (port) => {
    if (port.isDefault && (port.name === 'HELIOS' || port.name === 'VOLTA' || port.name === 'LOUXOR')) {
      toast({
        title: "Action non autorisée",
        description: `Le portefeuille système ${port.name} est indispensable et ne peut être supprimé.`,
        variant: "destructive"
      });
      return;
    }

    const assignedCount = projectCounts[normalizePortfolioName(port.name)] || 0;
    const confirmMessage = assignedCount > 0
      ? `Attention : ${assignedCount} projet(s) sont actuellement affectés au portefeuille "${port.name}". Voulez-vous vraiment le supprimer ?`
      : `Voulez-vous vraiment supprimer le portefeuille "${port.name}" ?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await deletePortfolio(port.id);
      toast({
        title: "Portefeuille supprimé",
        description: `Le portefeuille ${port.name} a été supprimé avec succès.`
      });
    } catch (err) {
      toast({
        title: "Erreur lors de la suppression",
        description: err.message || "Une erreur est survenue.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto z-[99999] bg-white p-6 rounded-2xl shadow-2xl border border-slate-200">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900">
                  Gestion des Portefeuilles
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {canManagePortfolios
                    ? "En tant qu'administrateur, créez, modifiez ou supprimez les portefeuilles PV et BESS."
                    : "Consultation des portefeuilles de projets actifs."}
                </DialogDescription>
              </div>
            </div>

            {canManagePortfolios && !isCreating && (
              <Button
                size="sm"
                onClick={() => handleStartCreate('PV')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau portefeuille</span>
              </Button>
            )}
          </div>

          {/* Onglets Filtre Types */}
          <div className="flex items-center gap-1.5 mt-4 pt-1">
            {[
              { id: 'ALL', label: 'Tous', count: portfolios.length },
              { id: 'PV', label: 'Photovoltaïque (PV)', count: portfolios.filter(p => p.type === 'PV').length },
              { id: 'BESS', label: 'Stockage (BESS)', count: portfolios.filter(p => p.type === 'BESS').length },
              { id: 'HYBRIDE', label: 'Hybride', count: portfolios.filter(p => p.type === 'HYBRIDE').length }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Formulaire de création rapide */}
        {canManagePortfolios && isCreating && (
          <form onSubmit={handleCreateSubmit} className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 my-2 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200">
              <span className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-blue-600" />
                Créer un nouveau portefeuille
              </span>
              <button
                type="button"
                onClick={handleCancelCreate}
                className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Annuler
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Nom du portefeuille *
                </label>
                <Input
                  required
                  placeholder="ex: CASSIOPEE"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                  className="h-9 text-xs font-black uppercase tracking-wider"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Type d'énergie *
                </label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold"
                >
                  <option value="PV">Photovoltaïque (PV)</option>
                  <option value="BESS">Batterie / Stockage (BESS)</option>
                  <option value="HYBRIDE">Hybride (PV + BESS)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Entité SPV (optionnel)
                </label>
                <Input
                  placeholder="ex: CASSIOPÉE SPV 1"
                  value={formData.spv}
                  onChange={e => setFormData({ ...formData, spv: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Description / Note
              </label>
              <Input
                placeholder="ex: Portefeuille toitures agricoles et hangars 2026..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCancelCreate} className="h-8 text-xs">
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? 'Création...' : 'Valider la création'}
              </Button>
            </div>
          </form>
        )}

        {/* Liste des portefeuilles */}
        <div className="space-y-2.5 my-2">
          {filteredPortfolios.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Aucun portefeuille trouvé pour ce type.
            </div>
          ) : (
            filteredPortfolios.map(port => {
              const isEditing = editingId === port.id;
              const assignedCount = projectCounts[normalizePortfolioName(port.name)] || 0;

              if (isEditing) {
                return (
                  <form
                    key={port.id}
                    onSubmit={e => handleEditSubmit(e, port.id)}
                    className="p-3.5 bg-amber-50/70 border border-amber-300 rounded-xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs font-black text-amber-900">
                      <span>Modifier le portefeuille {port.name}</span>
                      <button type="button" onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        value={editData.name}
                        onChange={e => setEditData({ ...editData, name: e.target.value.toUpperCase() })}
                        placeholder="Nom"
                        className="h-8 text-xs font-black uppercase"
                      />
                      <select
                        value={editData.type}
                        onChange={e => setEditData({ ...editData, type: e.target.value })}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold"
                      >
                        <option value="PV">Photovoltaïque (PV)</option>
                        <option value="BESS">Stockage (BESS)</option>
                        <option value="HYBRIDE">Hybride</option>
                      </select>
                      <Input
                        value={editData.spv}
                        onChange={e => setEditData({ ...editData, spv: e.target.value })}
                        placeholder="SPV"
                        className="h-8 text-xs"
                      />
                    </div>

                    <Input
                      value={editData.description}
                      onChange={e => setEditData({ ...editData, description: e.target.value })}
                      placeholder="Description"
                      className="h-8 text-xs"
                    />

                    <div className="flex justify-end gap-2 pt-1">
                      <Button type="button" size="sm" variant="ghost" onClick={handleCancelEdit} className="h-7 text-xs">
                        Annuler
                      </Button>
                      <Button type="submit" size="sm" disabled={loading} className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white">
                        Enregistrer
                      </Button>
                    </div>
                  </form>
                );
              }

              const isPv = port.type === 'PV';
              const isBess = port.type === 'BESS';
              const badgeBg = isPv ? 'bg-amber-100 text-amber-800 border-amber-300' : (isBess ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300');
              const Icon = isPv ? Sun : (isBess ? BatteryCharging : Layers);

              return (
                <div
                  key={port.id}
                  className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${
                      isPv ? 'bg-amber-50 border-amber-200 text-amber-600' : (isBess ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600')
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 tracking-wide">
                          {port.name}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-full border uppercase ${badgeBg}`}>
                          {port.type}
                        </span>
                        {port.spv && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            • {port.spv}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {port.description || `Portefeuille ${port.type}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 border border-slate-200" title="Projets CRM affectés">
                      {assignedCount} {assignedCount > 1 ? 'projets' : 'projet'}
                    </span>

                    {canManagePortfolios && (
                      <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(port)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(port)}
                          disabled={port.isDefault && (port.name === 'HELIOS' || port.name === 'VOLTA')}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={port.isDefault && (port.name === 'HELIOS' || port.name === 'VOLTA') ? "Portefeuille système protégé" : "Supprimer"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="border-t pt-3 flex justify-between items-center sm:justify-between">
          <span className="text-[11px] text-slate-400">
            {portfolios.length} portefeuilles enregistrés • Visible par tous les utilisateurs
          </span>
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
