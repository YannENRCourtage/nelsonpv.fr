import React, { useState, useEffect } from 'react';
import { 
    X, Plus, Search, FileText, ExternalLink, Edit2, Trash2, RotateCcw, 
    Check, Sun, Zap, BatteryCharging, Layers, Cpu, Wrench, Shield, Info
} from 'lucide-react';
import { 
    getProductCatalog, saveCatalogItem, resetCatalogToDefaults, 
    PRODUCT_CATEGORIES, DEFAULT_PRODUCT_CATALOG 
} from '@/services/productCatalogService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';

const CATEGORY_ICONS = {
    module: Sun,
    inverter: Zap,
    battery: BatteryCharging,
    mounting: Layers,
    electrical: Cpu,
    service: Wrench
};

export default function ProductCatalogModal({ isOpen, onClose, onSelectProduct = null }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        ref: '',
        marque: '',
        modele: '',
        category: 'module',
        puissanceWc: '',
        prixUnitaireHt: '',
        tauxTva: '20',
        unite: 'U',
        garantieAnnees: '25',
        ficheTechniqueUrl: '',
        description: ''
    });

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getProductCatalog({
                category: selectedCategory,
                search: searchQuery
            });
            setProducts(data);
        } catch (e) {
            console.error(e);
            setProducts(DEFAULT_PRODUCT_CATALOG);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadProducts();
        }
    }, [isOpen, selectedCategory, searchQuery]);

    const handleOpenEdit = (item) => {
        setFormData({
            id: item.id,
            ref: item.ref || '',
            marque: item.marque || '',
            modele: item.modele || '',
            category: item.category || 'module',
            puissanceWc: item.puissanceWc || '',
            prixUnitaireHt: item.prixUnitaireHt || '',
            tauxTva: item.tauxTva !== undefined ? String(item.tauxTva) : '20',
            unite: item.unite || 'U',
            garantieAnnees: item.garantieAnnees || '25',
            ficheTechniqueUrl: item.ficheTechniqueUrl || '',
            description: item.description || ''
        });
        setEditingItem(item);
        setIsCreating(false);
    };

    const handleOpenCreate = () => {
        setFormData({
            ref: '',
            marque: '',
            modele: '',
            category: selectedCategory !== 'all' ? selectedCategory : 'module',
            puissanceWc: '',
            prixUnitaireHt: '',
            tauxTva: '20',
            unite: 'U',
            garantieAnnees: '25',
            ficheTechniqueUrl: '',
            description: ''
        });
        setEditingItem(null);
        setIsCreating(true);
    };

    const handleSaveForm = async (e) => {
        e.preventDefault();
        if (!formData.ref.trim() || !formData.marque.trim() || !formData.modele.trim() || !formData.prixUnitaireHt) {
            toast({ title: 'Erreur', description: 'Veuillez remplir la référence, marque, modèle et prix unitaire.', variant: 'destructive' });
            return;
        }

        try {
            await saveCatalogItem({
                ...formData,
                puissanceWc: formData.puissanceWc ? parseFloat(formData.puissanceWc) : null,
                prixUnitaireHt: parseFloat(formData.prixUnitaireHt),
                tauxTva: parseFloat(formData.tauxTva),
                garantieAnnees: formData.garantieAnnees ? parseInt(formData.garantieAnnees) : null
            });
            toast({ title: 'Succès', description: 'Produit enregistré avec succès dans le catalogue.' });
            setIsCreating(false);
            setEditingItem(null);
            loadProducts();
        } catch (err) {
            toast({ title: 'Erreur', description: 'Impossible d\'enregistrer le produit.', variant: 'destructive' });
        }
    };

    const handleReset = () => {
        if (window.confirm('Voulez-vous réinitialiser le catalogue avec les équipements officiels ENR Courtage ?')) {
            const defaults = resetCatalogToDefaults();
            setProducts(defaults);
            toast({ title: 'Catalogue réinitialisé', description: 'Le catalogue officiel par défaut a été restauré.' });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                            <Sun className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                Catalogue Matériel Solaire & Fiches Techniques
                            </h2>
                            <p className="text-xs text-slate-300">
                                Modules, Onduleurs, Batteries, Fixations, Électrique & Fiches Fabricants
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleReset}
                            className="bg-transparent border-slate-600 text-slate-200 hover:bg-slate-800 text-xs flex items-center gap-1.5"
                            title="Restaurer le catalogue par défaut"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Réinitialiser
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={handleOpenCreate}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" />
                            Nouveau Produit
                        </Button>
                        <button 
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors ml-2"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Filtres & Recherche */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                selectedCategory === 'all' 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border'
                            }`}
                        >
                            Tous les produits ({products.length})
                        </button>
                        {PRODUCT_CATEGORIES.map(cat => {
                            const Icon = CATEGORY_ICONS[cat.id] || Sun;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                                        selectedCategory === cat.id 
                                            ? 'bg-blue-600 text-white shadow-sm' 
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <Input
                            placeholder="Rechercher par réf, marque, modèle..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs bg-white dark:bg-slate-800"
                        />
                    </div>
                </div>

                {/* Contenu principal : Liste ou Formulaire */}
                <div className="p-6 overflow-y-auto flex-1">
                    {(isCreating || editingItem) ? (
                        /* Formulaire d'édition / création */
                        <form onSubmit={handleSaveForm} className="max-w-3xl mx-auto bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                    {isCreating ? 'Ajouter un nouvel article au catalogue' : `Modifier l'article : ${formData.ref}`}
                                </h3>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => { setIsCreating(false); setEditingItem(null); }}
                                >
                                    Annuler
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Référence Unique *</label>
                                    <Input
                                        value={formData.ref}
                                        onChange={(e) => setFormData({ ...formData, ref: e.target.value })}
                                        placeholder="Ex: TSM-440NEG9R.28"
                                        className="mt-1 h-9 text-xs font-mono font-bold"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Catégorie *</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                                    >
                                        {PRODUCT_CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Marque / Fabricant *</label>
                                    <Input
                                        value={formData.marque}
                                        onChange={(e) => setFormData({ ...formData, marque: e.target.value })}
                                        placeholder="Ex: Trina Solar, Huawei, Enphase..."
                                        className="mt-1 h-9 text-xs"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Modèle / Désignation *</label>
                                    <Input
                                        value={formData.modele}
                                        onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
                                        placeholder="Ex: Vertex S+ 440W Biverre"
                                        className="mt-1 h-9 text-xs"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Puissance (Wc / kW / kWh)</label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={formData.puissanceWc}
                                        onChange={(e) => setFormData({ ...formData, puissanceWc: e.target.value })}
                                        placeholder="Ex: 440 (Wc) ou 10000 (W onduleur)"
                                        className="mt-1 h-9 text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Prix Unitaire HT (€) *</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.prixUnitaireHt}
                                        onChange={(e) => setFormData({ ...formData, prixUnitaireHt: e.target.value })}
                                        placeholder="Ex: 98.00"
                                        className="mt-1 h-9 text-xs font-bold text-blue-600"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Taux de TVA Applicable (%)</label>
                                    <select
                                        value={formData.tauxTva}
                                        onChange={(e) => setFormData({ ...formData, tauxTva: e.target.value })}
                                        className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                                    >
                                        <option value="20">20.0% (Standard / Tertiaire)</option>
                                        <option value="10">10.0% (Résidentiel ≤ 3 kWc)</option>
                                        <option value="5.5">5.5% (Amélioration énergétique)</option>
                                        <option value="0">0.0% (Exonéré / Autoliquidation)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Garantie Constructeur (Années)</label>
                                    <Input
                                        type="number"
                                        value={formData.garantieAnnees}
                                        onChange={(e) => setFormData({ ...formData, garantieAnnees: e.target.value })}
                                        placeholder="Ex: 25"
                                        className="mt-1 h-9 text-xs"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                        <span>URL Fiche Technique Constructeur (PDF) *</span>
                                        {formData.ficheTechniqueUrl && (
                                            <a 
                                                href={formData.ficheTechniqueUrl} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="text-blue-600 hover:underline flex items-center gap-1 text-[11px]"
                                            >
                                                Tester le lien PDF <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </label>
                                    <Input
                                        value={formData.ficheTechniqueUrl}
                                        onChange={(e) => setFormData({ ...formData, ficheTechniqueUrl: e.target.value })}
                                        placeholder="https://.../fiche_technique.pdf"
                                        className="mt-1 h-9 text-xs font-mono"
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Ce PDF sera automatiquement fusionné et joint à la fin de la proposition commerciale.
                                    </p>
                                </div>

                                <div className="col-span-2">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description & Caractéristiques</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        placeholder="Points clés, technologie, dimensions, certifications..."
                                        className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs shadow-sm resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => { setIsCreating(false); setEditingItem(null); }}
                                >
                                    Annuler
                                </Button>
                                <Button 
                                    type="submit" 
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                >
                                    Enregistrer l'Article
                                </Button>
                            </div>
                        </form>
                    ) : (
                        /* Liste des articles du catalogue */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.map(item => {
                                const Icon = CATEGORY_ICONS[item.category] || Sun;
                                return (
                                    <div 
                                        key={item.id || item.ref}
                                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                                            {item.marque}
                                                        </span>
                                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1" title={item.modele}>
                                                            {item.modele}
                                                        </h4>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                                                    {item.ref}
                                                </span>
                                            </div>

                                            {item.description && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                                                    {item.description}
                                                </p>
                                            )}

                                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                                                {item.puissanceWc && (
                                                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                                                        ⚡ {item.puissanceWc} {item.category === 'battery' ? 'Wh' : (item.puissanceWc > 1000 ? 'W' : 'Wc')}
                                                    </span>
                                                )}
                                                {item.garantieAnnees && (
                                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                                                        🛡️ {item.garantieAnnees} ans
                                                    </span>
                                                )}
                                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                                                    TVA {item.tauxTva}%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                            <div>
                                                <div className="text-[10px] text-slate-400 font-medium">Prix unitaire HT</div>
                                                <div className="text-base font-black text-slate-900 dark:text-white">
                                                    {item.prixUnitaireHt} € <span className="text-xs font-normal text-slate-500">/ {item.unite || 'U'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {item.ficheTechniqueUrl && (
                                                    <a 
                                                        href={item.ficheTechniqueUrl} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                                                        title="Voir la fiche technique PDF fabricant"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-slate-500 hover:text-slate-900"
                                                    onClick={() => handleOpenEdit(item)}
                                                    title="Modifier cet article"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                {onSelectProduct && (
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => onSelectProduct(item)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
                                                    >
                                                        Insérer
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Info className="w-4 h-4 text-blue-500" />
                        <span>Les fiches techniques PDF sont automatiquement concaténées dans les offres commerciales.</span>
                    </div>
                    <Button onClick={onClose} className="bg-slate-800 hover:bg-slate-900 text-white text-xs">
                        Fermer
                    </Button>
                </div>
            </div>
        </div>
    );
}
