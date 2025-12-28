import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, FileText, Wand2, Download, Send, FileType, CheckCircle2, Trash2, Search, User } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useDropzone } from 'react-dropzone';
import { simulateDataExtraction } from '../services/aiSimulationService';
import { generateDocument } from '../services/docGenerationService';

export default function CDP() {
    const { user } = useAuth();
    const { projects } = useProjects(); // Récupère tous les projets
    const { toast } = useToast();

    // États Workflow
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [projectSearch, setProjectSearch] = useState('');

    // Le projet actif est celui sélectionné, ou null
    const targetProject = useMemo(() =>
        projects.find(p => p.id === selectedProjectId),
        [projects, selectedProjectId]);

    const [activeStep, setActiveStep] = useState('upload'); // upload | generate | finish
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

    // Données
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [extractedData, setExtractedData] = useState(null);

    // Templates
    const [selectedTemplateId, setSelectedTemplateId] = useState('custom');
    const [customTemplateFile, setCustomTemplateFile] = useState(null);

    // Templates Prédéfinis
    const templates = [
        { id: 'custom', name: 'Importer mon modèle (.docx)', type: 'Manuel' },
        { id: 'bail_solaire', name: 'Promesse de Bail Solaire', type: 'Construction', url: '/templates/bail_solaire.docx' },
        { id: 'mandat', name: 'Mandat de Représentation', type: 'Ternaire', url: '/templates/mandat.docx' },
    ];

    // Drag & Drop Logic (Sources)
    const onDropSource = useCallback(acceptedFiles => {
        setUploadedFiles(prev => [...prev, ...acceptedFiles]);
        toast({ description: `${acceptedFiles.length} fichier(s) ajouté(s)` });
    }, [toast]);

    const { getRootProps: getSourceRoot, getInputProps: getSourceInput, isDragActive: isSourceDrag } = useDropzone({
        onDrop: onDropSource,
        accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }
    });

    // Drag & Drop Logic (Template Custom)
    const onDropTemplate = useCallback(acceptedFiles => {
        const file = acceptedFiles[0];
        if (file) {
            setCustomTemplateFile(file);
            setSelectedTemplateId('custom');
            toast({ description: `Modèle chargé : ${file.name}` });
        }
    }, [toast]);

    const { getRootProps: getTemplateRoot, getInputProps: getTemplateInput, isDragActive: isTemplateDrag } = useDropzone({
        onDrop: onDropTemplate,
        maxFiles: 1,
        accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }
    });

    // Actions
    const handleRemoveFile = (index) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSimulateExtraction = async () => {
        if (uploadedFiles.length === 0) {
            toast({ variant: "destructive", title: "Aucun document", description: "Veuillez uploader au moins un fichier source." });
            return;
        }

        setIsProcessingAI(true);
        try {
            const iaData = await simulateDataExtraction(uploadedFiles);
            setExtractedData(iaData);
            toast({
                title: "Analyse IA Terminée",
                description: "Données extraites avec succès. Étape suivante déverrouillée.",
                className: "bg-green-50 border-green-200"
            });
            setActiveStep('generate');
        } catch (err) {
            toast({ variant: "destructive", title: "Erreur IA", description: "L'analyse a échoué." });
        } finally {
            setIsProcessingAI(false);
        }
    };

    const handleGenerateDocument = async () => {
        setIsGeneratingDoc(true);
        try {
            // 1. Préparer les données finales (Fusion Projet CIBLE + IA)
            const finalData = {
                ...targetProject, // Données du projet SÉLECTIONNÉ
                ...extractedData, // Données IA
                date_jour: new Date().toLocaleDateString('fr-FR'),
                client_nom_complet: `${targetProject?.name || ''} ${targetProject?.firstName || ''}`.trim()
            };

            console.log("Fusion Data pour génération:", finalData);

            // 2. Identifier la source du template
            let templateSource = null;
            let outputName = "Document_Generé.docx";

            if (selectedTemplateId === 'custom') {
                if (!customTemplateFile) throw new Error("Veuillez uploader un fichier modèle .docx");
                templateSource = customTemplateFile;
                outputName = `GEN_${customTemplateFile.name}`;
            } else {
                const template = templates.find(t => t.id === selectedTemplateId);
                if (!template || !template.url) throw new Error("Template introuvable");
                templateSource = template.url;
                outputName = `GEN_${template.id}.docx`;
            }

            // 3. Appeler le service
            await generateDocument(templateSource, finalData, outputName);

            toast({
                title: "Succès",
                description: "Le document a été généré et téléchargé.",
                className: "bg-green-50 border-green-200"
            });

            setActiveStep('finish');

        } catch (err) {
            toast({
                variant: "destructive",
                title: "Erreur Génération",
                description: err.message
            });
        } finally {
            setIsGeneratingDoc(false);
        }
    };

    // UI Composants
    const DataRow = ({ label, value, isAi = false }) => (
        <div className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
            <span className="text-slate-500 text-sm">{label}</span>
            <span className={`font-medium text-sm ${isAi ? 'text-blue-600' : 'text-slate-900'} truncate max-w-[200px]`} title={value}>
                {value || '-'} {isAi && <Wand2 className="w-3 h-3 inline ml-1" />}
            </span>
        </div>
    );

    // Filtrage Projets pour la recherche
    const filteredProjects = useMemo(() => {
        if (!projectSearch) return [];
        const lower = projectSearch.toLowerCase();
        return projects.filter(p =>
            (p.name && p.name.toLowerCase().includes(lower)) ||
            (p.firstName && p.firstName.toLowerCase().includes(lower)) ||
            (p.city && p.city.toLowerCase().includes(lower))
        ).slice(0, 5); // Limite à 5 résultats pour l'UI
    }, [projects, projectSearch]);

    return (
        <div className="container mx-auto p-6 space-y-8 max-w-7xl animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Espace Chargée de Développement Projet
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Automatisation documentaire & Intelligence Artificielle
                    </p>
                </div>
            </div>

            {/* Étape 0 : Sélection Projet */}
            <Card className="border-l-4 border-l-slate-500 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="w-5 h-5" /> Sélection du Projet
                    </CardTitle>
                    <CardDescription>Recherchez le projet client pour initialiser le dossier</CardDescription>
                </CardHeader>
                <CardContent>
                    {!targetProject ? (
                        <div className="relative max-w-xl">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Rechercher par nom, prénom ou ville..."
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    value={projectSearch}
                                    onChange={(e) => setProjectSearch(e.target.value)}
                                />
                            </div>
                            {/* Liste Résultats Suggestion */}
                            {projectSearch && !targetProject && (
                                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 mt-1 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                                    {filteredProjects.length > 0 ? (
                                        filteredProjects.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => { setSelectedProjectId(p.id); setProjectSearch(''); }}
                                                className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center"
                                            >
                                                <div>
                                                    <div className="font-semibold text-slate-800">{p.name} {p.firstName}</div>
                                                    <div className="text-xs text-slate-500">{p.city} ({p.zip})</div>
                                                </div>
                                                <div className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{p.projectSize || 'Projet'}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-3 text-sm text-slate-500 text-center">Aucun projet trouvé</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700">
                                    <User size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-green-900">{targetProject.name} {targetProject.firstName}</div>
                                    <div className="text-sm text-green-700">{targetProject.city} - {targetProject.type || 'Projet'}</div>
                                </div>
                            </div>
                            <Button variant="ghost" onClick={() => { setSelectedProjectId(null); setExtractedData(null); }} className="text-slate-500 hover:text-red-500">
                                Changer
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Main Grid Layout - Uniquement si projet sélectionné */}
            {targetProject && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full animate-in slide-in-from-bottom-4 fade-in duration-500">

                    {/* Colonne 1 : Upload & IA */}
                    <div className="space-y-6">
                        <Card className={`border-l-4 transition-all duration-300 ${activeStep === 'upload' ? 'border-l-blue-500 shadow-lg ring-1 ring-blue-100' : 'border-l-transparent'}`}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-700">
                                    <Upload className="w-5 h-5" />
                                    1. Sources & IA
                                </CardTitle>
                                <CardDescription>Factures, Kbis, CNI...</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Zone Drop Source */}
                                <div
                                    {...getSourceRoot()}
                                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${isSourceDrag ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <input {...getSourceInput()} />
                                    <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-slate-700">Documents Source</p>
                                    <p className="text-xs text-slate-400">PDF, JPG, PNG</p>
                                </div>

                                {/* Liste fichiers */}
                                {uploadedFiles.length > 0 && (
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {uploadedFiles.map((f, i) => (
                                            <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded text-sm">
                                                <span className="truncate max-w-[180px]">{f.name}</span>
                                                <button onClick={() => handleRemoveFile(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <Button
                                    onClick={handleSimulateExtraction}
                                    disabled={isProcessingAI || uploadedFiles.length === 0}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {isProcessingAI ? <><Wand2 className="w-4 h-4 mr-2 animate-spin" /> Analyse...</> : <><Wand2 className="w-4 h-4 mr-2" /> Analyser (IA)</>}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Colonne 2 : Templates & Mapping */}
                    <div className="space-y-6">
                        <Card className={`border-l-4 transition-all duration-300 ${activeStep === 'generate' ? 'border-l-purple-500 shadow-lg ring-1 ring-purple-100' : 'border-l-transparent opacity-90'}`}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-purple-700">
                                    <FileType className="w-5 h-5" />
                                    2. Génération
                                </CardTitle>
                                <CardDescription>Choix du modèle Word</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">

                                {/* Choix Template */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-700">Modèle à utiliser</label>
                                    <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
                                        {templates.map(t => (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedTemplateId(t.id)}
                                                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${selectedTemplateId === t.id ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-500' : 'bg-white border-slate-200 hover:border-purple-200'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-slate-500" />
                                                    <span className="text-sm font-medium">{t.name}</span>
                                                </div>
                                                {selectedTemplateId === t.id && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Zone Drop Custom Template */}
                                    {selectedTemplateId === 'custom' && (
                                        <div
                                            {...getTemplateRoot()}
                                            className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer mt-2 ${isTemplateDrag ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <input {...getTemplateInput()} />
                                            {customTemplateFile ? (
                                                <div className="text-green-600 flex items-center justify-center gap-2 font-medium">
                                                    <CheckCircle2 size={16} /> {customTemplateFile.name}
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-slate-600">Glissez votre fichier <strong>.docx</strong> ici</p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Aperçu Données */}
                                {extractedData && (
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 animate-in slide-in-from-top-2">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                            <Wand2 size={12} /> Données Fusionnées
                                        </h4>
                                        <div className="space-y-1">
                                            <DataRow label="Client" value={`${targetProject?.name} ${targetProject?.firstName}`} />
                                            <DataRow label="Ref Dossier" value={extractedData.ia_ref_dossier} isAi />
                                            <DataRow label="PDL" value={extractedData.ia_numero_pdl} isAi />
                                            <DataRow label="Conso." value={extractedData.ia_consommation_annuelle} isAi />
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleGenerateDocument}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                    disabled={isGeneratingDoc || !extractedData || (selectedTemplateId === 'custom' && !customTemplateFile)}
                                >
                                    {isGeneratingDoc ? <><Wand2 className="w-4 h-4 mr-2 animate-spin" /> Génération...</> : <><Download className="w-4 h-4 mr-2" /> Générer DOCX</>}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Colonne 3 : Yousign */}
                    <div className="space-y-6">
                        <Card className={`border-l-4 transition-all duration-300 ${activeStep === 'finish' ? 'border-l-green-500 shadow-lg opacity-100' : 'border-l-transparent opacity-60 grayscale'}`}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-700">
                                    <Send className="w-5 h-5" />
                                    3. Signature
                                </CardTitle>
                                <CardDescription>Finalisation Yousign</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-6 text-slate-500">
                                    {activeStep === 'finish' ? (
                                        <div className="space-y-4">
                                            <div className="text-green-600 bg-green-50 p-3 rounded-lg text-sm">
                                                Document prêt pour signature !
                                            </div>
                                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                                                <Send className="w-4 h-4 mr-2" /> Envoyer (Simulation)
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="text-sm">Générez le document pour activer l'envoi.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            )}
        </div>
    );
}
