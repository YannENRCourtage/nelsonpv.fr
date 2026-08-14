import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, Mail, Phone, MapPin, Building, Trash2, Edit2,
  Check, X, Tag, Filter, UserCheck, ShieldCheck, Sparkles
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

/**
 * ProfessionnelsView — Base de données des partenaires et sous-traitants tiers
 * Tableau Monday.com avec gestion multi-catégories (Architecte, Huissier, Géomètre, Notaire)
 * et possibilité d'ajouter dynamiquement de nouvelles catégories personnalisées.
 */
export default function ProfessionnelsView({
  professionals = [],
  onAddProfessional,
  onUpdateProfessional,
  onDeleteProfessional
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState(null);

  // Catégories par défaut et gestion de nouvelles catégories dynamiques
  const [customCategories, setCustomCategories] = useState([
    { id: 'architecte', label: 'Architecte', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { id: 'huissier', label: 'Huissier', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { id: 'geometre', label: 'Géomètre', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { id: 'notaire', label: 'Notaire', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  ]);

  const [newCatInput, setNewCatInput] = useState('');
  const [showNewCatField, setShowNewCatField] = useState(false);

  // État du formulaire modal
  const [formData, setFormData] = useState({
    name: '',
    firstName: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    zip: '',
    city: '',
    categories: ['geometre'],
  });

  // Charger les catégories personnalisées sauvegardées
  useEffect(() => {
    const saved = localStorage.getItem('nelson_custom_categories');
    if (saved) {
      try {
        setCustomCategories(JSON.parse(saved));
      } catch (e) {
        console.error('Erreur chargement categories:', e);
      }
    }
  }, []);

  const handleAddCategory = () => {
    if (!newCatInput.trim()) return;
    const catId = newCatInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!customCategories.some(c => c.id === catId)) {
      const colors = [
        'bg-pink-100 text-pink-800 border-pink-200',
        'bg-indigo-100 text-indigo-800 border-indigo-200',
        'bg-teal-100 text-teal-800 border-teal-200',
        'bg-orange-100 text-orange-800 border-orange-200',
      ];
      const newCat = {
        id: catId,
        label: newCatInput.trim(),
        color: colors[customCategories.length % colors.length]
      };
      const updated = [...customCategories, newCat];
      setCustomCategories(updated);
      localStorage.setItem('nelson_custom_categories', JSON.stringify(updated));
      setNewCatInput('');
      setShowNewCatField(false);
      toast({ title: 'Nouvelle catégorie ajoutée', description: `La catégorie "${newCat.label}" est disponible.` });
    }
  };

  const handleOpenAdd = () => {
    setEditingProf(null);
    setFormData({
      name: '',
      firstName: '',
      company: '',
      phone: '',
      email: '',
      address: '',
      zip: '',
      city: '',
      categories: ['geometre'],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prof) => {
    setEditingProf(prof);
    setFormData({
      name: prof.name || prof.lastName || '',
      firstName: prof.firstName || '',
      company: prof.company || prof.entreprise || '',
      phone: prof.phone || prof.telephone || '',
      email: prof.email || '',
      address: prof.address || prof.adresse || '',
      zip: prof.zip || prof.code_postal || '',
      city: prof.city || prof.ville || '',
      categories: Array.isArray(prof.categories) ? prof.categories : [prof.type, prof.category].filter(Boolean),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: 'Nom requis', description: 'Veuillez saisir le nom du professionnel.', variant: 'destructive' });
      return;
    }

    try {
      if (editingProf) {
        if (onUpdateProfessional) {
          await onUpdateProfessional(editingProf.id, formData);
        }
        toast({ title: 'Professionnel mis à jour', description: 'Les modifications ont été enregistrées avec succès.' });
      } else {
        if (onAddProfessional) {
          await onAddProfessional(formData);
        }
        toast({ title: 'Professionnel ajouté', description: 'Le nouveau contact a été enregistré dans le répertoire.' });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erreur sauvegarde professionnel:', err);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder le contact.', variant: 'destructive' });
    }
  };

  const toggleCategoryInForm = (catId) => {
    setFormData(prev => {
      const current = prev.categories || [];
      if (current.includes(catId)) {
        return { ...prev, categories: current.filter(c => c !== catId) };
      } else {
        return { ...prev, categories: [...current, catId] };
      }
    });
  };

  // Filtrage des professionnels
  const filteredProfessionals = useMemo(() => {
    return professionals.filter(p => {
      // 1. Filtre catégorie
      if (selectedCategoryFilter !== 'all') {
        const pCats = Array.isArray(p.categories) ? p.categories : [p.type, p.category].filter(Boolean);
        const hasCat = pCats.some(c => c && c.toLowerCase().includes(selectedCategoryFilter.toLowerCase()));
        if (!hasCat) return false;
      }

      // 2. Filtre recherche
      if (searchTerm.trim() !== '') {
        const clean = searchTerm.toLowerCase().trim();
        const matchName = (p.name || p.lastName || '').toLowerCase().includes(clean);
        const matchFirst = (p.firstName || '').toLowerCase().includes(clean);
        const matchCompany = (p.company || p.entreprise || '').toLowerCase().includes(clean);
        const matchEmail = (p.email || '').toLowerCase().includes(clean);
        const matchCity = (p.city || p.ville || '').toLowerCase().includes(clean);

        if (!matchName && !matchFirst && !matchCompany && !matchEmail && !matchCity) {
          return false;
        }
      }

      return true;
    });
  }, [professionals, selectedCategoryFilter, searchTerm]);

  const getCategoryBadge = (catKey) => {
    const cat = customCategories.find(c => c.id === catKey || c.label.toLowerCase() === catKey?.toLowerCase());
    if (cat) {
      return (
        <span key={catKey} className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${cat.color}`}>
          {cat.label}
        </span>
      );
    }
    return (
      <span key={catKey} className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        {catKey}
      </span>
    );
  };

  return (
    <div className="w-full space-y-5">
      {/* ── BARRE D'OUTILS ET RECHERCHE ──────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Répertoire des Professionnels & Partenaires
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-extrabold">
                {filteredProfessionals.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Gestion centralisée des huissiers, géomètres, notaires, architectes et bureaux d'études.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {/* Recherche */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher nom, entreprise, ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
            />
          </div>

          {/* Filtres par Catégorie */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                selectedCategoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous
            </button>
            {customCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  selectedCategoryFilter === cat.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Bouton Ajouter */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Ajouter un professionnel
          </button>
        </div>
      </div>

      {/* ── TABLEAU DES PROFESSIONNELS (Style Monday.com) ─────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Professionnel</th>
                <th className="py-3.5 px-4">Entreprise / Étude</th>
                <th className="py-3.5 px-4">Catégories</th>
                <th className="py-3.5 px-4">Coordonnées</th>
                <th className="py-3.5 px-4">Adresse complète</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredProfessionals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    Aucun professionnel ne correspond aux filtres.
                  </td>
                </tr>
              ) : (
                filteredProfessionals.map((p, idx) => {
                  const name = `${p.firstName || ''} ${p.name || p.lastName || ''}`.trim() || 'Contact sans nom';
                  const company = p.company || p.entreprise || '—';
                  const cats = Array.isArray(p.categories) ? p.categories : [p.type, p.category].filter(Boolean);
                  const addressFull = `${p.address || ''} ${p.zip || ''} ${p.city || ''}`.trim() || '—';

                  return (
                    <tr key={p.id || idx} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Nom & Prénom */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">
                            {name.charAt(0)}
                          </div>
                          <span>{name}</span>
                        </div>
                      </td>

                      {/* Entreprise */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {company}
                        </span>
                      </td>

                      {/* Tags Catégories */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {cats.length > 0 ? cats.map(getCategoryBadge) : <span className="text-slate-400 text-[11px]">Non catégorisé</span>}
                        </div>
                      </td>

                      {/* Téléphone & Email */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          {p.phone && (
                            <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-slate-700 hover:text-blue-600 font-semibold">
                              <Phone className="w-3 h-3 text-slate-400" /> {p.phone}
                            </a>
                          )}
                          {p.email && (
                            <a href={`mailto:${p.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                              <Mail className="w-3 h-3 text-blue-400" /> {p.email}
                            </a>
                          )}
                          {!p.phone && !p.email && <span className="text-slate-400">—</span>}
                        </div>
                      </td>

                      {/* Adresse */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                          <span className="truncate max-w-[200px]" title={addressFull}>{addressFull}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Supprimer définitivement ${name} ?`)) {
                                onDeleteProfessional(p.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODALE AJOUT / ÉDITION PROFESSIONNEL ──────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg leading-tight">
                      {editingProf ? 'Modifier le professionnel' : 'Ajouter un nouveau professionnel'}
                    </h3>
                    <p className="text-xs text-white/80">Partenaire sous-traitant ou contact réglementaire</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                {/* Catégorisation Multi-tags */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block font-bold text-slate-800">
                    Catégories (Sélectionnez un ou plusieurs rôles)
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {customCategories.map(cat => {
                      const isSelected = (formData.categories || []).includes(cat.id);
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => toggleCategoryInForm(cat.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {cat.label}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setShowNewCatField(!showNewCatField)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nouvelle catégorie
                    </button>
                  </div>

                  {/* Input création catégorie dynamique */}
                  {showNewCatField && (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        placeholder="Ex: Bureau d'études, Terrassier..."
                        value={newCatInput}
                        onChange={(e) => setNewCatInput(e.target.value)}
                        className="flex-1 p-2 bg-white border border-purple-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700"
                      >
                        Ajouter
                      </button>
                    </div>
                  )}
                </div>

                {/* Champs identité */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nom *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Dupont"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Prénom</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Ex: Jean"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Entreprise / Nom de l'étude</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Ex: SCP Dupont & Associés - Huissiers de Justice"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="05 56 00 00 00"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@etude-dupont.fr"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Adresse complète</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="12 Rue de la République"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Code Postal</label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      placeholder="33000"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ville</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Bordeaux"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    {editingProf ? 'Enregistrer les modifications' : 'Créer le professionnel'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
