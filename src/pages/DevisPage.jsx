import React, { useState, useEffect } from 'react';
import { 
    FileText, Plus, Search, Download, Trash2, Edit2, 
    BookOpen, RefreshCw, CheckCircle, Clock, XCircle, 
    TrendingUp, Sun, Zap, Shield, ArrowUpRight, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjects } from '@/contexts/ProjectContext';
import { toast } from '@/components/ui/use-toast';
import QuoteEditorModal from '@/components/devis/QuoteEditorModal';
import ProductCatalogModal from '@/components/devis/ProductCatalogModal';
import { fetchEnergyTariffs, DEFAULT_ENERGY_TARIFS } from '@/services/energyTariffsService';

function formatEuro(val) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0);
}

export default function DevisPage() {
    const { projects } = useProjects();
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modals
    const [quoteEditorOpen, setQuoteEditorOpen] = useState(false);
    const [catalogModalOpen, setCatalogModalOpen] = useState(false);
    const [selectedProjectForQuote, setSelectedProjectForQuote] = useState(null);
    const [selectedQuoteToEdit, setSelectedQuoteToEdit] = useState(null);

    // Energy Tariffs
    const [energyTarifs, setEnergyTarifs] = useState(DEFAULT_ENERGY_TARIFS);

    const loadQuotes = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/quotes');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setQuotes(data);
                    return;
                }
            }
        } catch (e) {
            // LocalStorage fallback
        }

        // Check local storage for quotes
        try {
            const localQuotes = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('quote_DEV-')) {
                    const item = JSON.parse(localStorage.getItem(key));
                    localQuotes.push(item);
                }
            }
            setQuotes(localQuotes);
        } catch (err) {
            setQuotes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQuotes();
        fetchEnergyTariffs().then(data => setEnergyTarifs(data)).catch(() => {});
    }, []);

    const handleCreateQuoteForProject = (project) => {
        setSelectedProjectForQuote(project);
        setSelectedQuoteToEdit(null);
        setQuoteEditorOpen(true);
    };

    const handleEditExistingQuote = (quote) => {
        const matchingProject = projects?.find(p => p.id === quote.projectId) || {
            name: quote.clientName,
            address: quote.clientAddress,
            projectSize: quote.powerKwc
        };
        setSelectedProjectForQuote(matchingProject);
        setSelectedQuoteToEdit(quote);
        setQuoteEditorOpen(true);
    };

    const handleDeleteQuote = async (quote) => {
        if (!window.confirm(`Supprimer définitivement le devis ${quote.quoteNumber} ?`)) return;

        try {
            if (quote.id) {
                await fetch(`/api/quotes/${quote.id}`, { method: 'DELETE' });
            }
            localStorage.removeItem(`quote_${quote.quoteNumber}`);
            setQuotes(prev => prev.filter(q => q.quoteNumber !== quote.quoteNumber));
            toast({ title: 'Devis supprimé', description: 'Le devis a été retiré.' });
        } catch (e) {
            toast({ title: 'Erreur', description: 'Impossible de supprimer le devis.', variant: 'destructive' });
        }
    };

    const filteredQuotes = quotes.filter(q => {
        if (statusFilter !== 'all' && q.status !== statusFilter) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                (q.quoteNumber && q.quoteNumber.toLowerCase().includes(query)) ||
                (q.clientName && q.clientName.toLowerCase().includes(query)) ||
                (q.clientCity && q.clientCity.toLowerCase().includes(query))
            );
        }
        return true;
    });

    // KPI calculations
    const totalDevisAmount = quotes.reduce((acc, q) => acc + (q.totalTtc || 0), 0);
    const avgDevisAmount = quotes.length > 0 ? totalDevisAmount / quotes.length : 0;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="bg-amber-500 text-slate-950 text-xs font-black uppercase px-2.5 py-0.5 rounded-full">
                            Module Devis & Chiffrage
                        </span>
                        <span className="text-xs text-slate-300">Conforme normes CRE / EDF OA</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
                        Éditeur de Devis & Offres Solaires
                    </h1>
                    <p className="text-xs md:text-sm text-slate-300 max-w-2xl mt-1">
                        Générez en quelques clics des propositions commerciales complètes intégrant l'étude technico-économique, le devis chiffré et la fusion automatique des fiches techniques fabricants.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        onClick={() => setCatalogModalOpen(true)}
                        variant="outline"
                        size="sm"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs flex items-center gap-1.5"
                    >
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        Catalogue Matériel & Fiches PDF
                    </Button>
                    <Button
                        onClick={() => {
                            setSelectedProjectForQuote(null);
                            setSelectedQuoteToEdit(null);
                            setQuoteEditorOpen(true);
                        }}
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau Devis
                    </Button>
                </div>
            </div>

            {/* KPIs & Tarifs en direct */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500">Devis & Projets Chiffrés</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                            {quotes.length} dossier{quotes.length > 1 ? 's' : ''}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500">Volume Total Chiffré</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                            {formatEuro(totalDevisAmount)}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500">Tarif Rachat EDF OA Surplus</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                            0.1269 €<span className="text-xs font-normal text-slate-500">/kWh</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                        <Sun className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500">TRV Électricité de Référence</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                            {energyTarifs.trv?.base || 0.2516} €<span className="text-xs font-normal text-slate-500">/kWh</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Raccourci : Créer un devis instantané depuis un projet existant */}
            {projects && projects.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-slate-800/40 dark:to-slate-800/60 p-4 rounded-2xl border border-blue-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-2">
                            <Sun className="w-4 h-4 text-amber-500" />
                            Générer une Offre Solaire pour un Projet en Cours
                        </h3>
                        <span className="text-xs text-slate-500">Sélectionnez un projet pour pré-remplir le devis</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {projects.slice(0, 8).map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => handleCreateQuoteForProject(p)}
                                className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-left hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between"
                            >
                                <div>
                                    <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">
                                        {p.name || 'Projet Sans Nom'}
                                    </div>
                                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                        {p.city ? `${p.zip || ''} ${p.city}` : (p.address || 'Adresse à préciser')}
                                    </div>
                                </div>
                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                        {p.projectSize || '9'} kWc
                                    </span>
                                    <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                                        Chiffrer <ArrowUpRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Liste des devis enregistrés */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                            Historique des Devis Réalisés
                        </h2>
                        <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-mono">
                            {filteredQuotes.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <Input
                                placeholder="Rechercher un devis..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 h-8 text-xs bg-white dark:bg-slate-900"
                            />
                        </div>
                    </div>
                </div>

                {filteredQuotes.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 space-y-3">
                        <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Aucun devis trouvé
                        </div>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Cliquez sur "Nouveau Devis" ou choisissez un projet ci-dessus pour concevoir votre première offre personnalisée avec fiches techniques fusionnées.
                        </p>
                        <Button 
                            size="sm"
                            onClick={() => {
                                setSelectedProjectForQuote(null);
                                setSelectedQuoteToEdit(null);
                                setQuoteEditorOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs mt-2"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Créer un Devis
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                    <th className="py-3 px-4">N° Devis</th>
                                    <th className="py-3 px-4">Client</th>
                                    <th className="py-3 px-4">Localisation</th>
                                    <th className="py-3 px-4 text-center">Puissance</th>
                                    <th className="py-3 px-4 text-right">Montant HT</th>
                                    <th className="py-3 px-4 text-right">Total TTC</th>
                                    <th className="py-3 px-4 text-center">Statut</th>
                                    <th className="py-3 px-4 text-center">Date</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                {filteredQuotes.map((q) => (
                                    <tr key={q.id || q.quoteNumber} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                                            {q.quoteNumber}
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                            {q.clientName}
                                        </td>
                                        <td className="py-3 px-4 text-slate-500">
                                            {q.clientCity ? `${q.clientZip} ${q.clientCity}` : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold text-amber-600">
                                            {q.powerKwc ? `${q.powerKwc} kWc` : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                                            {formatEuro(q.totalNetHt)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                                            {formatEuro(q.totalTtc)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 uppercase">
                                                {q.status || 'Brouillon'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-500">
                                            {q.createdAt ? new Date(q.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEditExistingQuote(q)}
                                                    className="h-7 px-2 text-xs flex items-center gap-1"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                    Modifier / Exporter PDF
                                                </Button>
                                                <button
                                                    onClick={() => handleDeleteQuote(q)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            <QuoteEditorModal
                isOpen={quoteEditorOpen}
                onClose={() => setQuoteEditorOpen(false)}
                project={selectedProjectForQuote || {}}
                initialQuote={selectedQuoteToEdit}
                onQuoteSaved={() => {
                    loadQuotes();
                }}
            />

            <ProductCatalogModal
                isOpen={catalogModalOpen}
                onClose={() => setCatalogModalOpen(false)}
            />
        </div>
    );
}
