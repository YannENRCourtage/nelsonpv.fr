import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, Plus, Trash2, Download, Save, RefreshCw, FileText, 
    CheckCircle, AlertCircle, Percent, Euro, Sun, Zap, Shield, 
    BookOpen, Check, Layers, ExternalLink, Calendar, User, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { 
    generateDefaultQuoteLines, getProductCatalog 
} from '@/services/productCatalogService';
import { 
    fetchEnergyTariffs, getTarifsForPower, DEFAULT_ENERGY_TARIFS 
} from '@/services/energyTariffsService';
import { generateQuoteProposalPdf } from '@/services/QuoteProposalPdfService';
import ProductCatalogModal from './ProductCatalogModal';

function formatEuro(val) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0);
}

export default function QuoteEditorModal({ 
    isOpen, 
    onClose, 
    project = {}, 
    initialQuote = null,
    onQuoteSaved = () => {} 
}) {
    // État du catalogue modal
    const [catalogModalOpen, setCatalogModalOpen] = useState(false);
    const [targetSectionIdForCatalog, setTargetSectionIdForCatalog] = useState(null);

    // Données des tarifs de l'énergie (TRV & EDF OA)
    const [energyTarifs, setEnergyTarifs] = useState(DEFAULT_ENERGY_TARIFS);
    const [refreshingTarifs, setRefreshingTarifs] = useState(false);

    // État principal du devis
    const [quoteData, setQuoteData] = useState({
        quoteNumber: '',
        status: 'brouillon',
        powerKwc: 9.0,
        clientName: '',
        clientAddress: '',
        clientZip: '',
        clientCity: '',
        clientPhone: '',
        clientEmail: '',
        commercialName: '',
        validityDays: 30,
        remiseGlobale: 0,
        autoConsomPercent: 70,
        sections: []
    });

    // État de génération PDF et progression
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfProgress, setPdfProgress] = useState({ percent: 0, message: '' });

    // Chargement initial des données
    useEffect(() => {
        if (!isOpen) return;

        // 1. Chargement des tarifs énergie
        const loadTarifs = async () => {
            try {
                const data = await fetchEnergyTariffs();
                setEnergyTarifs(data);
            } catch (err) {
                console.error('Erreur chargement tarifs', err);
            }
        };
        loadTarifs();

        // 2. Initialisation du devis (soit devis existant, soit calcul auto basé sur le projet)
        if (initialQuote && initialQuote.sections) {
            setQuoteData({
                ...initialQuote,
                sections: initialQuote.sections
            });
        } else {
            // Dimensionnement automatique
            const defaults = generateDefaultQuoteLines(project);
            const now = new Date();
            const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
            const autoNum = `DEV-${yearMonth}-${Math.floor(1000 + Math.random() * 9000)}`;

            setQuoteData({
                quoteNumber: autoNum,
                status: 'brouillon',
                powerKwc: defaults.powerKwc,
                clientName: `${project.firstName || ''} ${project.name || 'Nouveau Client'}`.trim(),
                clientAddress: project.address || '',
                clientZip: project.zip || '',
                clientCity: project.city || '',
                clientPhone: project.phone || '',
                clientEmail: project.email || '',
                commercialName: project.user || 'Conseiller ENR Courtage',
                validityDays: 30,
                remiseGlobale: 0,
                autoConsomPercent: 70,
                sections: defaults.sections
            });
        }
    }, [isOpen, project, initialQuote]);

    // Calculs financiers en temps réel
    const calculatedTotals = useMemo(() => {
        let totalHtBrut = 0;
        const tvaBases = { 20: 0, 10: 0, 5.5: 0, 0: 0 };

        (quoteData.sections || []).forEach(sec => {
            (sec.lines || []).forEach(line => {
                const qty = parseFloat(line.quantite || 0);
                const pu = parseFloat(line.prixUnitaireHt || 0);
                const rem = parseFloat(line.remisePourcent || 0);
                const lineHt = qty * pu * (1 - rem / 100);
                const tvaRate = parseFloat(line.tauxTva !== undefined ? line.tauxTva : 20);

                totalHtBrut += qty * pu;
                if (tvaBases[tvaRate] !== undefined) {
                    tvaBases[tvaRate] += lineHt;
                } else {
                    tvaBases[20] += lineHt;
                }
            });
        });

        const remiseGlobale = parseFloat(quoteData.remiseGlobale || 0);
        const totalNetHt = Math.max(0, Object.values(tvaBases).reduce((a, b) => a + b, 0) - remiseGlobale);

        let totalTva = 0;
        const tvaBreakdown = [];
        [20, 10, 5.5, 0].forEach(rate => {
            const base = tvaBases[rate] || 0;
            if (base > 0) {
                const montant = base * (rate / 100);
                totalTva += montant;
                tvaBreakdown.push({ rate, base, montant });
            }
        });

        const totalTtc = totalNetHt + totalTva;

        // Tarifs EDF OA & Prime
        const powerKwc = parseFloat(quoteData.powerKwc || 9);
        const tariffsForPower = getTarifsForPower(powerKwc, 'surplus', energyTarifs);
        const primeAuto = tariffsForPower.primeTotal || 0;
        const resteACharge = Math.max(0, totalTtc - primeAuto);

        return {
            totalHtBrut,
            remiseGlobale,
            totalNetHt,
            totalTva,
            tvaBreakdown,
            totalTtc,
            tariffsForPower,
            primeAuto,
            resteACharge
        };
    }, [quoteData, energyTarifs]);

    // Manipulation des lignes de devis
    const handleLineChange = (sectionId, lineId, field, value) => {
        setQuoteData(prev => ({
            ...prev,
            sections: prev.sections.map(sec => {
                if (sec.id !== sectionId) return sec;
                return {
                    ...sec,
                    lines: sec.lines.map(line => {
                        if (line.id !== lineId) return line;
                        return { ...line, [field]: value };
                    })
                };
            })
        }));
    };

    const handleDeleteLine = (sectionId, lineId) => {
        setQuoteData(prev => ({
            ...prev,
            sections: prev.sections.map(sec => {
                if (sec.id !== sectionId) return sec;
                return {
                    ...sec,
                    lines: sec.lines.filter(l => l.id !== lineId)
                };
            })
        }));
    };

    const handleAddCustomLine = (sectionId) => {
        const newLine = {
            id: `line-${Date.now()}`,
            ref: 'PERSO',
            designation: 'Nouvelle ligne de prestation ou matériel',
            details: '',
            quantite: 1,
            unite: 'U',
            prixUnitaireHt: 0,
            remisePourcent: 0,
            tauxTva: quoteData.powerKwc <= 3 ? 10 : 20,
            includeDatasheet: false
        };

        setQuoteData(prev => ({
            ...prev,
            sections: prev.sections.map(sec => {
                if (sec.id !== sectionId) return sec;
                return { ...sec, lines: [...sec.lines, newLine] };
            })
        }));
    };

    const handleOpenCatalogForSection = (sectionId) => {
        setTargetSectionIdForCatalog(sectionId);
        setCatalogModalOpen(true);
    };

    const handleSelectProductFromCatalog = (product) => {
        if (!targetSectionIdForCatalog) return;

        const newLine = {
            id: `line-${Date.now()}`,
            ref: product.ref,
            designation: `${product.marque} ${product.modele}`,
            details: product.description || '',
            quantite: 1,
            unite: product.unite || 'U',
            prixUnitaireHt: product.prixUnitaireHt || 0,
            remisePourcent: 0,
            tauxTva: product.tauxTva !== undefined ? product.tauxTva : (quoteData.powerKwc <= 3 ? 10 : 20),
            ficheTechniqueUrl: product.ficheTechniqueUrl || null,
            includeDatasheet: Boolean(product.ficheTechniqueUrl)
        };

        setQuoteData(prev => ({
            ...prev,
            sections: prev.sections.map(sec => {
                if (sec.id !== targetSectionIdForCatalog) return sec;
                return { ...sec, lines: [...sec.lines, newLine] };
            })
        }));

        setCatalogModalOpen(false);
        toast({ title: 'Produit inséré', description: `${product.modele} a été ajouté au devis.` });
    };

    // Actualiser les tarifs énergie en direct
    const handleRefreshTarifs = async () => {
        setRefreshingTarifs(true);
        try {
            const data = await fetchEnergyTariffs(true);
            setEnergyTarifs(data);
            toast({ title: 'Tarifs actualisés', description: 'Tarifs TRV et EDF OA synchronisés avec les barèmes officiels.' });
        } catch (e) {
            toast({ title: 'Erreur', description: 'Impossible d\'actualiser les tarifs énergétiques.', variant: 'destructive' });
        } finally {
            setRefreshingTarifs(false);
        }
    };

    // Sauvegarde du devis (Base de données et/ou LocalStorage)
    const handleSaveQuote = async () => {
        try {
            const quotePayload = {
                ...quoteData,
                projectId: project.id || null,
                totalHtBrut: calculatedTotals.totalHtBrut,
                remiseGlobale: calculatedTotals.remiseGlobale,
                totalNetHt: calculatedTotals.totalNetHt,
                tvaDetails: calculatedTotals.tvaBreakdown,
                totalTtc: calculatedTotals.totalTtc
            };

            const res = await fetch('/api/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quotePayload)
            });

            if (res.ok) {
                const saved = await res.json();
                toast({ title: 'Devis sauvegardé', description: `Le devis N° ${quoteData.quoteNumber} a été enregistré avec succès.` });
                onQuoteSaved(saved);
            } else {
                // LocalStorage fallback
                localStorage.setItem(`quote_${quoteData.quoteNumber}`, JSON.stringify(quotePayload));
                toast({ title: 'Devis sauvegardé', description: `Le devis ${quoteData.quoteNumber} a été enregistré en cache local.` });
            }
        } catch (e) {
            console.error(e);
            toast({ title: 'Sauvegarde locale', description: 'Enregistré localement.' });
        }
    };

    // Génération et fusion du PDF multi-pages complet
    const handleGeneratePdf = async () => {
        setIsGeneratingPdf(true);
        setPdfProgress({ percent: 5, message: 'Initialisation de l\'étude et du devis...' });

        try {
            const result = await generateQuoteProposalPdf({
                project,
                quoteData,
                energyTarifs: calculatedTotals.tariffsForPower,
                onProgress: ({ percent, message }) => {
                    setPdfProgress({ percent, message });
                }
            });

            if (result.success) {
                toast({
                    title: 'Dossier PDF généré !',
                    description: `Dossier commercial complet téléchargé avec ${result.datasheetsAppended} fiche(s) technique(s) constructeur intégrée(s).`
                });
            }
        } catch (error) {
            console.error('Erreur génération PDF:', error);
            toast({
                title: 'Erreur génération PDF',
                description: error.message || 'Une erreur est survenue lors de l\'assemblage du PDF.',
                variant: 'destructive'
            });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[55000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header Barre Supérieure */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-lg border border-amber-400/30 shadow-inner">
                            ⚡
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-xl font-bold text-white tracking-tight">
                                    Éditeur de Devis & Offres Solaires
                                </h2>
                                <span className="text-xs font-mono font-bold bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full">
                                    {quoteData.quoteNumber}
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                                <span>Client : <strong>{quoteData.clientName || 'Nouveau Client'}</strong></span>
                                <span>•</span>
                                <span>Puissance : <strong>{quoteData.powerKwc} kWc</strong></span>
                                <span>•</span>
                                <span>Adresse : {quoteData.clientCity ? `${quoteData.clientZip} ${quoteData.clientCity}` : 'Non renseignée'}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setTargetSectionIdForCatalog(quoteData.sections[0]?.id || null);
                                setCatalogModalOpen(true);
                            }}
                            className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-600 text-xs flex items-center gap-1.5"
                        >
                            <BookOpen className="w-4 h-4 text-amber-400" />
                            Catalogue Matériel
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveQuote}
                            className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-600 text-xs flex items-center gap-1.5"
                        >
                            <Save className="w-4 h-4 text-blue-400" />
                            Sauvegarder
                        </Button>

                        <Button
                            size="sm"
                            disabled={isGeneratingPdf}
                            onClick={handleGeneratePdf}
                            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                            {isGeneratingPdf ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                            ) : (
                                <Download className="w-4 h-4 text-slate-950" />
                            )}
                            Générer Proposition & Devis PDF
                        </Button>

                        <button 
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors ml-1"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Bandeau Tarifs de l'Énergie & Données Réglementées (TRV & EDF OA) */}
                <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <span>Tarifs Réglementés (TRV) :</span>
                            <span className="font-normal text-slate-600 dark:text-slate-400">
                                Base: <strong>{calculatedTotals.tariffsForPower.trvBase} €/kWh</strong> | 
                                HP: <strong>{calculatedTotals.tariffsForPower.trvHp} €/kWh</strong> | 
                                HC: <strong>{calculatedTotals.tariffsForPower.trvHc} €/kWh</strong>
                            </span>
                        </div>

                        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

                        <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span>Obligation d'Achat (EDF OA) :</span>
                            <span className="font-normal text-slate-600 dark:text-slate-300">
                                Rachat surplus : <strong>{calculatedTotals.tariffsForPower.tarifAchatRetenu} €/kWh</strong> (20 ans)
                                {calculatedTotals.primeAuto > 0 && (
                                    <> • Prime autoconsommation : <strong className="text-emerald-600">{formatEuro(calculatedTotals.primeAuto)}</strong> ({calculatedTotals.tariffsForPower.primeAutoKwc} €/kWc)</>
                                )}
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={refreshingTarifs}
                        onClick={handleRefreshTarifs}
                        className="h-7 text-[11px] text-slate-500 hover:text-blue-600 flex items-center gap-1"
                        title="Actualiser les données avec Open Data Réseaux Énergies / CRE"
                    >
                        <RefreshCw className={`w-3 h-3 ${refreshingTarifs ? 'animate-spin' : ''}`} />
                        Sync Tarifs CRE
                    </Button>
                </div>

                {/* Corps Principal : Formulaire & Lignes de Devis */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Informations Projet & Client */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Nom & Prénom Client</label>
                            <Input
                                value={quoteData.clientName}
                                onChange={e => setQuoteData({ ...quoteData, clientName: e.target.value })}
                                className="mt-1 h-8 text-xs bg-white dark:bg-slate-900"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Adresse</label>
                            <Input
                                value={quoteData.clientAddress}
                                onChange={e => setQuoteData({ ...quoteData, clientAddress: e.target.value })}
                                className="mt-1 h-8 text-xs bg-white dark:bg-slate-900"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Ville & Code Postal</label>
                            <div className="flex gap-1.5 mt-1">
                                <Input
                                    value={quoteData.clientZip}
                                    placeholder="CP"
                                    onChange={e => setQuoteData({ ...quoteData, clientZip: e.target.value })}
                                    className="h-8 w-20 text-xs bg-white dark:bg-slate-900"
                                />
                                <Input
                                    value={quoteData.clientCity}
                                    placeholder="Commune"
                                    onChange={e => setQuoteData({ ...quoteData, clientCity: e.target.value })}
                                    className="h-8 flex-1 text-xs bg-white dark:bg-slate-900"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Puissance Installée (kWc)</label>
                            <Input
                                type="number"
                                step="0.1"
                                value={quoteData.powerKwc}
                                onChange={e => setQuoteData({ ...quoteData, powerKwc: parseFloat(e.target.value) || 0 })}
                                className="mt-1 h-8 text-xs font-bold text-blue-600 bg-white dark:bg-slate-900"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-300">Taux d'Autoconsommation (%)</label>
                            <Input
                                type="number"
                                min="10"
                                max="100"
                                value={quoteData.autoConsomPercent}
                                onChange={e => setQuoteData({ ...quoteData, autoConsomPercent: parseInt(e.target.value) || 70 })}
                                className="mt-1 h-8 text-xs bg-white dark:bg-slate-900"
                            />
                        </div>
                    </div>

                    {/* Tableau des Sections & Lignes de Devis */}
                    <div className="space-y-5">
                        {quoteData.sections.map((section) => (
                            <div 
                                key={section.id}
                                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
                            >
                                {/* Titre de Section */}
                                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                            {section.title}
                                        </h3>
                                        {section.description && (
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {section.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleOpenCatalogForSection(section.id)}
                                            className="h-7 text-xs bg-white dark:bg-slate-800 text-blue-600 border-blue-200 hover:bg-blue-50 flex items-center gap-1"
                                        >
                                            <BookOpen className="w-3.5 h-3.5" />
                                            Depuis le catalogue
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleAddCustomLine(section.id)}
                                            className="h-7 text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Ligne libre
                                        </Button>
                                    </div>
                                </div>

                                {/* Table des lignes */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                                <th className="py-2.5 px-3 w-28">Réf</th>
                                                <th className="py-2.5 px-3">Désignation & Caractéristiques</th>
                                                <th className="py-2.5 px-3 w-24 text-center">Qté / Unité</th>
                                                <th className="py-2.5 px-3 w-28 text-right">P.U. HT (€)</th>
                                                <th className="py-2.5 px-3 w-20 text-center">Remise %</th>
                                                <th className="py-2.5 px-3 w-28 text-right">Total HT</th>
                                                <th className="py-2.5 px-3 w-24 text-center">TVA %</th>
                                                <th className="py-2.5 px-3 w-28 text-center">Fiche PDF</th>
                                                <th className="py-2.5 px-2 w-10 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                            {section.lines.map((line) => {
                                                const qty = parseFloat(line.quantite || 0);
                                                const pu = parseFloat(line.prixUnitaireHt || 0);
                                                const rem = parseFloat(line.remisePourcent || 0);
                                                const lineHt = qty * pu * (1 - rem / 100);

                                                return (
                                                    <tr key={line.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                                                        {/* Réf */}
                                                        <td className="py-2 px-3">
                                                            <Input
                                                                value={line.ref || ''}
                                                                onChange={e => handleLineChange(section.id, line.id, 'ref', e.target.value)}
                                                                className="h-7 text-xs font-mono font-semibold"
                                                            />
                                                        </td>

                                                        {/* Désignation */}
                                                        <td className="py-2 px-3">
                                                            <Input
                                                                value={line.designation || ''}
                                                                onChange={e => handleLineChange(section.id, line.id, 'designation', e.target.value)}
                                                                className="h-7 text-xs font-medium"
                                                            />
                                                            {line.details && (
                                                                <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1">
                                                                    {line.details}
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Qté & Unité */}
                                                        <td className="py-2 px-3">
                                                            <div className="flex items-center gap-1">
                                                                <Input
                                                                    type="number"
                                                                    step="any"
                                                                    value={line.quantite || ''}
                                                                    onChange={e => handleLineChange(section.id, line.id, 'quantite', parseFloat(e.target.value) || 0)}
                                                                    className="h-7 w-14 text-xs text-center"
                                                                />
                                                                <span className="text-[11px] text-slate-500">{line.unite || 'U'}</span>
                                                            </div>
                                                        </td>

                                                        {/* P.U. HT */}
                                                        <td className="py-2 px-3">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={line.prixUnitaireHt || ''}
                                                                onChange={e => handleLineChange(section.id, line.id, 'prixUnitaireHt', parseFloat(e.target.value) || 0)}
                                                                className="h-7 text-xs text-right font-mono"
                                                            />
                                                        </td>

                                                        {/* Remise % */}
                                                        <td className="py-2 px-3">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={line.remisePourcent || ''}
                                                                placeholder="0"
                                                                onChange={e => handleLineChange(section.id, line.id, 'remisePourcent', parseFloat(e.target.value) || 0)}
                                                                className="h-7 w-14 text-xs text-center mx-auto"
                                                            />
                                                        </td>

                                                        {/* Total HT */}
                                                        <td className="py-2 px-3 text-right font-bold font-mono text-slate-900 dark:text-white">
                                                            {formatEuro(lineHt)}
                                                        </td>

                                                        {/* TVA % */}
                                                        <td className="py-2 px-3 text-center">
                                                            <select
                                                                value={String(line.tauxTva !== undefined ? line.tauxTva : 20)}
                                                                onChange={e => handleLineChange(section.id, line.id, 'tauxTva', parseFloat(e.target.value))}
                                                                className="h-7 rounded border border-input bg-background px-1.5 text-xs text-center shadow-sm"
                                                            >
                                                                <option value="20">20%</option>
                                                                <option value="10">10%</option>
                                                                <option value="5.5">5.5%</option>
                                                                <option value="0">0%</option>
                                                            </select>
                                                        </td>

                                                        {/* Fiche Technique PDF */}
                                                        <td className="py-2 px-3 text-center">
                                                            {line.ficheTechniqueUrl ? (
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`ds-${line.id}`}
                                                                        checked={Boolean(line.includeDatasheet)}
                                                                        onChange={e => handleLineChange(section.id, line.id, 'includeDatasheet', e.target.checked)}
                                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                                                        title="Concaténer la fiche technique PDF constructeur à la fin de l'offre"
                                                                    />
                                                                    <label htmlFor={`ds-${line.id}`} className="text-[11px] font-semibold text-slate-600 cursor-pointer">
                                                                        Fusionner
                                                                    </label>
                                                                    <a 
                                                                        href={line.ficheTechniqueUrl} 
                                                                        target="_blank" 
                                                                        rel="noreferrer" 
                                                                        className="text-blue-500 hover:text-blue-700 ml-1"
                                                                        title="Voir la fiche PDF fabricant"
                                                                    >
                                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                                    </a>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400 italic">-</span>
                                                            )}
                                                        </td>

                                                        {/* Supprimer */}
                                                        <td className="py-2 px-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteLine(section.id, line.id)}
                                                                className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors"
                                                                title="Supprimer cette ligne"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Synthèse Financière & Récapitulatif TVA */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                        {/* Colonne Gauche : Conditions & Échéancier */}
                        <div className="lg:col-span-6 space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    Modalités de Règlement & Validité
                                </h4>
                                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                                        <span>• Acompte à la commande (signature) :</span>
                                        <strong className="text-slate-900 dark:text-white">30% ({formatEuro(calculatedTotals.totalTtc * 0.3)})</strong>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                                        <span>• À la livraison du matériel sur site :</span>
                                        <strong className="text-slate-900 dark:text-white">60% ({formatEuro(calculatedTotals.totalTtc * 0.6)})</strong>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span>• Solde à la mise en service & Consuel :</span>
                                        <strong className="text-slate-900 dark:text-white">10% ({formatEuro(calculatedTotals.totalTtc * 0.1)})</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300">
                                <h4 className="font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <Shield className="w-4 h-4 text-emerald-600" />
                                    Garanties et Assurances
                                </h4>
                                <p className="text-[11px] leading-relaxed">
                                    Assurance Décennale et Responsabilité Civile Professionnelle souscrite. 
                                    Modules photovoltaïques garantis 25 à 30 ans avec dégradation maximale garantie par les constructeurs.
                                </p>
                            </div>
                        </div>

                        {/* Colonne Droite : Totaux & Reste à Charge */}
                        <div className="lg:col-span-6 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                                <span>Total Brut HT :</span>
                                <span className="font-mono text-sm">{formatEuro(calculatedTotals.totalHtBrut)}</span>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-600 dark:text-slate-400">Remise commerciale (€) :</span>
                                <div className="w-32">
                                    <Input
                                        type="number"
                                        step="10"
                                        value={quoteData.remiseGlobale || ''}
                                        placeholder="0 €"
                                        onChange={e => setQuoteData({ ...quoteData, remiseGlobale: parseFloat(e.target.value) || 0 })}
                                        className="h-7 text-xs text-right font-mono text-red-600 bg-white dark:bg-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200 pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span>Total Net HT :</span>
                                <span className="font-mono text-base text-slate-900 dark:text-white">
                                    {formatEuro(calculatedTotals.totalNetHt)}
                                </span>
                            </div>

                            {/* Ventilation TVA */}
                            <div className="py-2 border-y border-slate-200 dark:border-slate-700 space-y-1 text-xs text-slate-500">
                                {calculatedTotals.tvaBreakdown.map(t => (
                                    <div key={t.rate} className="flex justify-between items-center">
                                        <span>TVA {t.rate}% (sur base {formatEuro(t.base)}) :</span>
                                        <span className="font-mono">{formatEuro(t.montant)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Total TTC */}
                            <div className="flex justify-between items-center p-3 rounded-xl bg-blue-900 text-white shadow-md">
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-200 block">
                                        Total Général TTC
                                    </span>
                                    <span className="text-[10px] text-blue-300">Toutes taxes comprises</span>
                                </div>
                                <span className="text-2xl font-black font-mono">
                                    {formatEuro(calculatedTotals.totalTtc)}
                                </span>
                            </div>

                            {/* Prime à l'autoconsommation & Reste à charge */}
                            {calculatedTotals.primeAuto > 0 && (
                                <div className="p-3 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 flex justify-between items-center text-xs">
                                    <div>
                                        <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                                            Prime à l'Autoconsommation Déductible (EDF OA) :
                                        </span>
                                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                            Versement officiel de l'État : - {formatEuro(calculatedTotals.primeAuto)}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">Reste à charge réel</div>
                                        <div className="text-lg font-black text-emerald-900 dark:text-emerald-100 font-mono">
                                            {formatEuro(calculatedTotals.resteACharge)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Modal */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-b-2xl">
                    <div className="text-xs text-slate-500">
                        Offre clé en main • Validité 30 jours • Certification RGE QualiPV
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={onClose} className="text-xs">
                            Fermer
                        </Button>
                        <Button 
                            onClick={handleGeneratePdf} 
                            disabled={isGeneratingPdf}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2"
                        >
                            {isGeneratingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Télécharger l'Offre & Fiches PDF
                        </Button>
                    </div>
                </div>
            </div>

            {/* Modal de progression de génération PDF */}
            {isGeneratingPdf && (
                <div className="fixed inset-0 z-[70000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 mx-auto flex items-center justify-center animate-pulse">
                            <FileText className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Génération du Dossier Commercial & Fiches Techniques
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            {pdfProgress.message || 'Traitement en cours...'}
                        </p>
                        
                        {/* Barre de progression */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-amber-500 to-blue-600 h-full rounded-full transition-all duration-300"
                                style={{ width: `${pdfProgress.percent}%` }}
                            />
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-500">
                            {pdfProgress.percent}%
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Catalogue Produit pour insertion */}
            <ProductCatalogModal
                isOpen={catalogModalOpen}
                onClose={() => setCatalogModalOpen(false)}
                onSelectProduct={handleSelectProductFromCatalog}
            />
        </div>
    );
}
