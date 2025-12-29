import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, FileText, Send, Search, CheckCircle2, Download, Upload, Copy, X } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createReport } from 'docx-templates';

export default function CDP() {
    const { user } = useAuth();
    const { projects } = useProjects();
    const { toast } = useToast();

    // États
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [projectSearch, setProjectSearch] = useState('');
    const [selectedTemplates, setSelectedTemplates] = useState([]);
    const [generatedDocuments, setGeneratedDocuments] = useState([]);

    // Documents chargés par template (stockés en localStorage)
    const [uploadedTemplates, setUploadedTemplates] = useState(() => {
        const saved = localStorage.getItem('cdp_uploaded_templates');
        return saved ? JSON.parse(saved) : {};
    });

    // Modal pour afficher les balises disponibles
    const [tagInstructionsModal, setTagInstructionsModal] = useState(null);

    // Formulaire Client (modifiable)
    const [clientData, setClientData] = useState({
        nom: '',
        prenom: '',
        telephone: '',
        email: '',
        adresse: '',
        codePostal: '',
        ville: '',
        typeBatiment: 'Bâtiment métallique',
        parcelles: '',
        hauteurSabliere: '',
        largeur: '',
        longueur: '',
        surface: '',
        faitA: '',
        lieu: ''
    });

    // Balises disponibles pour mapping
    const availableTags = [
        { key: '{{nom}}', label: 'Nom', value: () => clientData.nom },
        { key: '{{prenom}}', label: 'Prénom', value: () => clientData.prenom },
        { key: '{{nom_complet}}', label: 'Nom complet', value: () => `${clientData.nom} ${clientData.prenom}` },
        { key: '{{telephone}}', label: 'Téléphone', value: () => clientData.telephone },
        { key: '{{email}}', label: 'Email', value: () => clientData.email },
        { key: '{{adresse}}', label: 'Adresse', value: () => clientData.adresse },
        { key: '{{code_postal}}', label: 'Code Postal', value: () => clientData.codePostal },
        { key: '{{ville}}', label: 'Ville', value: () => clientData.ville },
        { key: '{{type_batiment}}', label: 'Type de bâtiment', value: () => clientData.typeBatiment },
        { key: '{{parcelles}}', label: 'Parcelles', value: () => clientData.parcelles },
        { key: '{{hauteur_sabliere}}', label: 'Hauteur sablière', value: () => clientData.hauteurSabliere },
        { key: '{{largeur}}', label: 'Largeur', value: () => clientData.largeur },
        { key: '{{longueur}}', label: 'Longueur', value: () => clientData.longueur },
        { key: '{{surface}}', label: 'Surface', value: () => clientData.surface },
        { key: '{{fait_a}}', label: 'Fait à', value: () => clientData.faitA },
        { key: '{{lieu}}', label: 'Lieu', value: () => clientData.lieu },
    ];

    // Projet sélectionné
    const targetProject = useMemo(() =>
        projects.find(p => p.id === selectedProjectId),
        [projects, selectedProjectId]
    );

    // Remplir formulaire quand projet sélectionné
    useEffect(() => {
        if (targetProject) {
            setClientData({
                nom: targetProject.name || '',
                prenom: targetProject.firstName || '',
                telephone: targetProject.phone || '',
                email: targetProject.email || '',
                adresse: targetProject.address || '',
                codePostal: targetProject.zip || '',
                ville: targetProject.city || '',
                typeBatiment: targetProject.type || 'Bâtiment métallique',
                parcelles: targetProject.parcelles || '',
                hauteurSabliere: targetProject.eaveHeight || '',
                largeur: targetProject.width || '',
                longueur: targetProject.length || '',
                surface: targetProject.surface || '',
                faitA: '',
                lieu: ''
            });
        }
    }, [targetProject]);

    // Calcul automatique surface
    useEffect(() => {
        const l = parseFloat(clientData.largeur);
        const L = parseFloat(clientData.longueur);
        if (!isNaN(l) && !isNaN(L)) {
            setClientData(prev => ({ ...prev, surface: (l * L).toFixed(2) }));
        }
    }, [clientData.largeur, clientData.longueur]);

    // Templates disponibles
    const availableTemplates = [
        { id: 'mandat_representation', name: 'Mandat de représentation', category: 'Juridique' },
        { id: 'attestation_elagage', name: 'Attestation élagage', category: 'Administratif' },
        { id: 'attestation_amiante', name: 'Attestation enlèvement amiante', category: 'Technique' },
        { id: 'attestation_icpe', name: 'Attestation ICPE', category: 'Administratif' },
        { id: 'attestation_honneur', name: 'Attestation sur l\'honneur', category: 'Administratif' },
        { id: 'attestation_mise_disposition', name: 'Attestation mise à disposition', category: 'Administratif' },
        { id: 'notice_enr', name: 'Notice ENR', category: 'Commercial' },
        { id: 'plan_bardage', name: 'Plan de bardage & Aménagement', category: 'Technique' },
        { id: 'plan_bardage_symetrique', name: 'Plan de bardage & Aménagement symétrique', category: 'Technique' },
        { id: 'promesse_bail_construction_1', name: 'Promesse de bail Construction #1', category: 'Juridique' },
        { id: 'promesse_bail_construction_2', name: 'Promesse de bail Construction #2', category: 'Juridique' },
        { id: 'promesse_bail_construction_3', name: 'Promesse de bail Construction #3', category: 'Juridique' },
        { id: 'promesse_bail_ombriere_1', name: 'Promesse de bail Ombrière #1', category: 'Juridique' },
        { id: 'promesse_bail_ombriere_2', name: 'Promesse de bail Ombrière #2', category: 'Juridique' },
        { id: 'promesse_bail_ombriere_3', name: 'Promesse de bail Ombrière #3', category: 'Juridique' },
        { id: 'promesse_bail_toiture_1', name: 'Promesse de bail Toiture #1', category: 'Juridique' },
        { id: 'promesse_bail_toiture_2', name: 'Promesse de bail Toiture #2', category: 'Juridique' },
        { id: 'promesse_bail_toiture_3', name: 'Promesse de bail Toiture #3', category: 'Juridique' },
    ];

    // Toggle sélection template
    const toggleTemplate = (templateId) => {
        setSelectedTemplates(prev =>
            prev.includes(templateId)
                ? prev.filter(id => id !== templateId)
                : [...prev, templateId]
        );
    };

    // Chargement document pour un template
    const handleUploadTemplate = (templateId, templateName) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.docx,.pdf';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (file) {
                try {
                    // Convertir en base64 pour stockage
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = reader.result;
                        const newTemplates = {
                            ...uploadedTemplates,
                            [templateId]: {
                                fileName: file.name,
                                fileType: file.type,
                                fileData: base64,
                                uploadedAt: new Date().toISOString()
                            }
                        };
                        setUploadedTemplates(newTemplates);
                        localStorage.setItem('cdp_uploaded_templates', JSON.stringify(newTemplates));

                        toast({
                            title: "Document chargé",
                            description: `${file.name} enregistré pour ${templateName}`,
                            className: "bg-green-50 border-green-200"
                        });

                        // Ouvrir le modal des instructions
                        setTagInstructionsModal({ templateId, templateName, fileName: file.name });
                    };
                    reader.readAsDataURL(file);
                } catch (error) {
                    toast({
                        variant: "destructive",
                        title: "Erreur",
                        description: "Impossible de charger le fichier"
                    });
                }
            }
        };
        input.click();
    };

    // Copier une balise dans le presse-papier
    const copyTagToClipboard = (tag) => {
        navigator.clipboard.writeText(tag);
        toast({
            description: `${tag} copié !`,
            duration: 2000
        });
    };

    // Remplacement des balises dans un document
    const replaceTags = async (fileData, fileType) => {
        const tagValues = {};
        availableTags.forEach(tag => {
            const cleanKey = tag.key.replace(/[{}]/g, ''); // Retirer les accolades pour docx-templates
            tagValues[cleanKey] = tag.value();
        });

        if (fileType.includes('word') || fileType.includes('docx')) {
            // Document Word avec docx-templates
            try {
                const arrayBuffer = await fetch(fileData).then(r => r.arrayBuffer());
                const buffer = await createReport({
                    template: arrayBuffer,
                    data: tagValues,
                    cmdDelimiter: ['{{', '}}']
                });
                return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            } catch (error) {
                console.error('Erreur remplacement Word:', error);
                throw error;
            }
        } else if (fileType.includes('pdf')) {
            // PDF simple sans remplacement (nécessiterait PDFLib avec placement manuel)
            toast({
                variant: "destructive",
                title: "PDF non supporté",
                description: "Veuillez utiliser des fichiers Word (.docx) pour le remplacement automatique"
            });
            return null;
        }
    };

    // Génération des documents
    const handleGenerateDocuments = async () => {
        if (selectedTemplates.length === 0) {
            toast({ variant: "destructive", title: "Aucun template", description: "Sélectionnez au moins un document." });
            return;
        }

        const generated = [];

        for (const templateId of selectedTemplates) {
            const template = availableTemplates.find(t => t.id === templateId);
            const uploadedTemplate = uploadedTemplates[templateId];

            if (!uploadedTemplate) {
                toast({
                    variant: "destructive",
                    title: "Document manquant",
                    description: `Veuillez charger un document pour "${template.name}"`
                });
                continue;
            }

            try {
                const blob = await replaceTags(uploadedTemplate.fileData, uploadedTemplate.fileType);
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${template.name}_${clientData.nom}_${clientData.prenom}.docx`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                    generated.push(template.name);
                }
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Erreur génération",
                    description: `Impossible de générer "${template.name}"`
                });
            }
        }

        if (generated.length > 0) {
            setGeneratedDocuments(generated);
            toast({
                title: "Documents générés",
                description: `${generated.length} document(s) téléchargé(s)`,
                className: "bg-green-50 border-green-200"
            });
        }
    };

    // Recherche projets
    const filteredProjects = useMemo(() => {
        if (!projectSearch) return [];
        const lower = projectSearch.toLowerCase();
        return projects.filter(p =>
            (p.name && p.name.toLowerCase().includes(lower)) ||
            (p.firstName && p.firstName.toLowerCase().includes(lower)) ||
            (p.city && p.city.toLowerCase().includes(lower))
        ).slice(0, 5);
    }, [projects, projectSearch]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="w-full mx-auto">

                {/* HEADER */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Espace Chargée de Développement Projet
                    </h1>
                    <p className="text-slate-500 mt-1">Génération de documents & Signature électronique</p>
                </div>

                {/* LAYOUT 3 COLONNES */}
                <div className="grid grid-cols-3 gap-8">

                    {/* ========== VOLET 1 : CLIENT ========== */}
                    <Card className="h-fit">
                        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Client
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">

                            {/* Sélection Client */}
                            {!targetProject ? (
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Rechercher un client..."
                                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            value={projectSearch}
                                            onChange={(e) => setProjectSearch(e.target.value)}
                                        />
                                    </div>
                                    {projectSearch && filteredProjects.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 mt-1 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                                            {filteredProjects.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => { setSelectedProjectId(p.id); setProjectSearch(''); }}
                                                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                                                >
                                                    <div className="font-semibold text-slate-800">{p.name} {p.firstName}</div>
                                                    <div className="text-xs text-slate-500">{p.city}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                        <User className="w-5 h-5 text-green-600" />
                                        <div>
                                            <div className="font-bold text-green-900">{targetProject.name} {targetProject.firstName}</div>
                                            <div className="text-xs text-green-700">{targetProject.city}</div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedProjectId(null)}>
                                        Changer
                                    </Button>
                                </div>
                            )}

                            {/* Formulaire Client */}
                            <div className="space-y-3 pt-4 border-t">
                                <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wide">Informations Personnelles</h3>

                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Nom *"
                                        value={clientData.nom}
                                        onChange={(e) => setClientData({ ...clientData, nom: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Prénom *"
                                        value={clientData.prenom}
                                        onChange={(e) => setClientData({ ...clientData, prenom: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>

                                <input
                                    type="tel"
                                    placeholder="Téléphone"
                                    value={clientData.telephone}
                                    onChange={(e) => setClientData({ ...clientData, telephone: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />

                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={clientData.email}
                                    onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />

                                <input
                                    type="text"
                                    placeholder="Adresse"
                                    value={clientData.adresse}
                                    onChange={(e) => setClientData({ ...clientData, adresse: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />

                                <div className="grid grid-cols-3 gap-3">
                                    <input
                                        type="text"
                                        placeholder="CP"
                                        value={clientData.codePostal}
                                        onChange={(e) => setClientData({ ...clientData, codePostal: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Ville"
                                        value={clientData.ville}
                                        onChange={(e) => setClientData({ ...clientData, ville: e.target.value })}
                                        className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>

                                <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wide pt-4 border-t">Informations Projet</h3>

                                <select
                                    value={clientData.typeBatiment}
                                    onChange={(e) => setClientData({ ...clientData, typeBatiment: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="Bâtiment métallique">Bâtiment métallique</option>
                                    <option value="Ombrière">Ombrière</option>
                                    <option value="Couverture">Couverture</option>
                                </select>

                                <input
                                    type="text"
                                    placeholder="Numéro(s) de parcelle(s)"
                                    value={clientData.parcelles}
                                    onChange={(e) => setClientData({ ...clientData, parcelles: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />

                                <input
                                    type="number"
                                    placeholder="Hauteur sablière (m)"
                                    value={clientData.hauteurSabliere}
                                    onChange={(e) => setClientData({ ...clientData, hauteurSabliere: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />

                                <div className="grid grid-cols-3 gap-3">
                                    <input
                                        type="number"
                                        placeholder="Largeur (m)"
                                        value={clientData.largeur}
                                        onChange={(e) => setClientData({ ...clientData, largeur: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Longueur (m)"
                                        value={clientData.longueur}
                                        onChange={(e) => setClientData({ ...clientData, longueur: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Surface (m²)"
                                        value={clientData.surface}
                                        readOnly
                                        className="px-3 py-2 border border-slate-300 bg-slate-50 rounded-lg text-sm font-semibold text-blue-600"
                                    />
                                </div>

                                {/* Champs Fait à et Lieu */}
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Fait à"
                                        value={clientData.faitA}
                                        onChange={(e) => setClientData({ ...clientData, faitA: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Lieu"
                                        value={clientData.lieu}
                                        onChange={(e) => setClientData({ ...clientData, lieu: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ========== VOLET 2 : DOCUMENT ========== */}
                    <Card className="h-fit">
                        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Document
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">

                            <Button
                                onClick={handleGenerateDocuments}
                                disabled={!clientData.nom || selectedTemplates.length === 0}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Générer documents clients
                            </Button>

                            <div className="pt-4 border-t">
                                <h3 className="font-semibold text-sm text-slate-700 mb-3 uppercase tracking-wide">Bibliothèque de Templates</h3>

                                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {availableTemplates.map(template => (
                                        <div
                                            key={template.id}
                                            className={`p-3 rounded-lg border transition-all ${selectedTemplates.includes(template.id)
                                                    ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-500'
                                                    : 'bg-white border-slate-200'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div
                                                    className="flex items-center gap-3 flex-1 cursor-pointer"
                                                    onClick={() => toggleTemplate(template.id)}
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedTemplates.includes(template.id)
                                                            ? 'bg-purple-600 border-purple-600'
                                                            : 'border-slate-300'
                                                        }`}>
                                                        {selectedTemplates.includes(template.id) && (
                                                            <CheckCircle2 className="w-4 h-4 text-white" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm truncate">{template.name}</div>
                                                        <div className="text-xs text-slate-500">{template.category}</div>
                                                        {uploadedTemplates[template.id] && (
                                                            <div className="text-xs text-green-600 mt-1">
                                                                ✓ {uploadedTemplates[template.id].fileName}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-purple-300 text-purple-700 hover:bg-purple-50 flex-shrink-0"
                                                    onClick={() => handleUploadTemplate(template.id, template.name)}
                                                >
                                                    <Upload className="w-3 h-3 mr-1" />
                                                    Charger
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {selectedTemplates.length > 0 && (
                                    <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                        <p className="text-xs text-purple-700 font-medium">
                                            {selectedTemplates.length} template(s) sélectionné(s)
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ========== VOLET 3 : DOCUSIGN ========== */}
                    <Card className="h-fit">
                        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                            <CardTitle className="flex items-center gap-2">
                                <Send className="w-5 h-5" />
                                Docusign
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">

                            {generatedDocuments.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 text-green-700 font-medium">
                                            <CheckCircle2 className="w-5 h-5" />
                                            Documents prêts pour signature
                                        </div>
                                        <p className="text-xs text-green-600 mt-2">
                                            {generatedDocuments.length} document(s) généré(s)
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wide">Destinataires</h3>

                                        <div className="space-y-2">
                                            <input
                                                type="email"
                                                placeholder="Email destinataire 1"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                defaultValue={clientData.email}
                                            />
                                            <input
                                                type="email"
                                                placeholder="Email destinataire 2 (optionnel)"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                                            />
                                        </div>

                                        <textarea
                                            placeholder="Message personnalisé..."
                                            rows={3}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
                                        />

                                        <Button
                                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => toast({ title: "Simulation", description: "Intégration Docusign à venir" })}
                                        >
                                            <Send className="w-4 h-4 mr-2" />
                                            Envoyer pour signature
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm">Générez des documents pour activer l'envoi</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* ========== MODAL INSTRUCTIONS BALISES ========== */}
            {tagInstructionsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

                        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold">Balises Disponibles</h3>
                                    <p className="text-purple-100 text-sm mt-1">{tagInstructionsModal.templateName}</p>
                                    <p className="text-purple-200 text-xs mt-1">📎 {tagInstructionsModal.fileName}</p>
                                </div>
                                <button
                                    onClick={() => setTagInstructionsModal(null)}
                                    className="text-white hover:bg-purple-600 p-2 rounded-lg transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-900 text-sm mb-2">💡 Instructions</h4>
                                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                                    <li>Ouvrez votre document Word (.docx) téléchargé</li>
                                    <li>Cliquez sur les balises ci-dessous pour les copier</li>
                                    <li>Collez les balises aux emplacements souhaités dans votre document</li>
                                    <li>Sauvegardez et rechargez le document</li>
                                    <li>Les balises seront automatiquement remplacées lors de la génération</li>
                                </ol>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-700 mb-3">Balises Disponibles (cliquez pour copier)</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableTags.map(tag => (
                                        <button
                                            key={tag.key}
                                            onClick={() => copyTagToClipboard(tag.key)}
                                            className="text-left px-3 py-2 rounded-lg text-sm border bg-white border-slate-300 hover:border-purple-400 hover:bg-purple-50 transition flex items-center justify-between group"
                                        >
                                            <div>
                                                <code className="font-mono text-xs block text-purple-600">{tag.key}</code>
                                                <span className="text-xs text-slate-600">{tag.label}</span>
                                            </div>
                                            <Copy className="w-4 h-4 text-slate-400 group-hover:text-purple-600" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h4 className="font-semibold text-amber-900 text-sm mb-2">⚠️ Important</h4>
                                <ul className="text-xs text-amber-800 space-y-1">
                                    <li>• Les balises doivent être exactement comme indiquées (avec les accolades)</li>
                                    <li>• Utilisez uniquement des fichiers Word (.docx) pour le remplacement automatique</li>
                                    <li>• Les PDFs ne supportent pas encore le remplacement automatique</li>
                                </ul>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-slate-50 p-6 rounded-b-2xl border-t">
                            <Button
                                onClick={() => setTagInstructionsModal(null)}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                Compris !
                            </Button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
