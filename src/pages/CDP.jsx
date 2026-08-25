import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, FileText, Send, Search, CheckCircle2, Download, Upload, Save, X, Edit } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PDFViewer } from '../components/PDFViewer';
import { signDocument } from '../services/docusignService';
import { PlateSituation, PlateMasse, PlateNotice } from '../components/editor/DPPlates';
import html2canvas from 'html2canvas';
import { preloadProjectImages } from '@/utils/imageProxy';

export default function CDP() {
    const { user } = useAuth();
    const { projects, updateProject, saveProject, setProject } = useProjects();
    const { toast } = useToast();

    // États
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [projectSearch, setProjectSearch] = useState('');
    const [selectedTemplates, setSelectedTemplates] = useState([]);
    const [generatedDocuments, setGeneratedDocuments] = useState([]);

    // Documents chargés avec balises positionnées
    const [uploadedTemplates, setUploadedTemplates] = useState(() => {
        const saved = localStorage.getItem('cdp_uploaded_templates');
        return saved ? JSON.parse(saved) : {};
    });

    // Modal éditeur de balises avec PDFViewer
    const [tagEditorModal, setTagEditorModal] = useState(null);

    // Balise sélectionnée pour placement
    const [selectedTagForPlacement, setSelectedTagForPlacement] = useState(null);

    // Formulaire Client
    const [clientData, setClientData] = useState({
        nom: '',
        prenom: '',
        neA: '',
        neLe: '',
        date: '',
        telephone: '',
        email: '',
        adresse: '',
        codePostal: '',
        ville: '',
        regimeMatrimonial: '',
        societe: '',
        nomCompteSociete: '',
        enQualiteDe: '',
        nomMiseADisposition: '',
        nomExploitant: '',
        adresseProjet: '',
        parcelle1: '',
        parcelle2: '',
        parcelle3: '',
        parcelle4: '',
        parcelle5: '',
        parcelle6: '',
        usageParcelle: '',
        usageParcelle2: '',
        conditionsParticulieres: '',
        croixOuiICPE: 'X',
        croixNonICPE: 'X',
        hauteurSabliere: '',
        largeur: '',
        longueur: '',
        surface: '',
        faitA: '',
        lieu: '',
        champLibre1: '',
        champLibre2: '',
        champLibre3: '',
        champLibre4: ''
    });

    // Balises disponibles
    const availableTags = [
        { key: '{{nom}}', label: 'Nom', value: () => clientData.nom },
        { key: '{{prenom}}', label: 'Prénom', value: () => clientData.prenom },
        { key: '{{nom_complet}}', label: 'Nom complet', value: () => `${clientData.nom} ${clientData.prenom}` },
        { key: '{{ne_a}}', label: 'Né(e) à', value: () => clientData.neA },
        { key: '{{ne_le}}', label: 'Né(e) le', value: () => clientData.neLe },

        { key: '{{telephone}}', label: 'Téléphone', value: () => clientData.telephone },
        { key: '{{email}}', label: 'Email', value: () => clientData.email },
        { key: '{{adresse}}', label: 'Adresse', value: () => clientData.adresse },
        { key: '{{code_postal}}', label: 'Code Postal', value: () => clientData.codePostal },
        { key: '{{ville}}', label: 'Ville', value: () => clientData.ville },
        { key: '{{regime_matrimonial}}', label: 'Régime matrimonial', value: () => clientData.regimeMatrimonial },
        { key: '{{societe}}', label: 'Société', value: () => clientData.societe },
        { key: '{{nom_compte_societe}}', label: 'Nom pour le compte de la société', value: () => clientData.nomCompteSociete },
        { key: '{{en_qualite_de}}', label: 'En qualité de', value: () => clientData.enQualiteDe },

        { key: '{{nom_mise_a_disposition}}', label: 'Nom mise à disposition', value: () => clientData.nomMiseADisposition },
        { key: '{{nom_exploitant}}', label: 'Nom exploitant', value: () => clientData.nomExploitant },
        { key: '{{adresse_projet}}', label: 'Adresse projet', value: () => `${clientData.adresse} ${clientData.codePostal} ${clientData.ville}`.trim() },
        { key: '{{parcelle_1}}', label: 'Parcelle 1', value: () => clientData.parcelle1 },
        { key: '{{parcelle_2}}', label: 'Parcelle 2', value: () => clientData.parcelle2 },
        { key: '{{parcelle_3}}', label: 'Parcelle 3', value: () => clientData.parcelle3 },
        { key: '{{parcelle_4}}', label: 'Parcelle 4', value: () => clientData.parcelle4 },
        { key: '{{parcelle_5}}', label: 'Parcelle 5', value: () => clientData.parcelle5 },
        { key: '{{parcelle_6}}', label: 'Parcelle 6', value: () => clientData.parcelle6 },
        { key: '{{usage_parcelle_1}}', label: 'Usage de la parcelle 1', value: () => clientData.usageParcelle },
        { key: '{{usage_parcelle_2}}', label: 'Usage de la parcelle 2', value: () => clientData.usageParcelle2 },
        { key: '{{conditions_particulieres}}', label: 'Conditions particulières', value: () => clientData.conditionsParticulieres },
        { key: '{{croix_oui_icpe}}', label: 'Croix Oui ICPE', value: () => clientData.croixOuiICPE },
        { key: '{{croix_non_icpe}}', label: 'Croix Non ICPE', value: () => clientData.croixNonICPE },
        { key: '{{hauteur_sabliere}}', label: 'Hauteur sablière', value: () => clientData.hauteurSabliere },
        { key: '{{largeur}}', label: 'Largeur', value: () => clientData.largeur },
        { key: '{{longueur}}', label: 'Longueur', value: () => clientData.longueur },
        { key: '{{surface}}', label: 'Surface', value: () => clientData.surface },
        { key: '{{fait_a}}', label: 'Fait à', value: () => clientData.faitA },
        { key: '{{date}}', label: 'Date', value: () => clientData.date },
        { key: '{{champ_libre_1}}', label: 'Champ libre 1', value: () => clientData.champLibre1 },
        { key: '{{champ_libre_2}}', label: 'Champ libre 2', value: () => clientData.champLibre2 },
        { key: '{{champ_libre_3}}', label: 'Champ libre 3', value: () => clientData.champLibre3 },
        { key: '{{champ_libre_4}}', label: 'Champ libre 4', value: () => clientData.champLibre4 },
    ];

    // Projet sélectionné
    const targetProject = useMemo(() =>
        projects.find(p => p.id === selectedProjectId),
        [projects, selectedProjectId]
    );

    // Remplir formulaire et charger projet dans le contexte
    useEffect(() => {
        if (targetProject) {
            // Charger le projet sélectionné dans l'état 'project' du context
            setProject(targetProject);
            
            setClientData({
                nom: targetProject.name || '',
                prenom: targetProject.firstName || '',
                neA: '',
                neLe: '',
                date: '',
                telephone: targetProject.phone || '',
                email: targetProject.email || '',
                adresse: targetProject.address || '',
                codePostal: targetProject.zip || '',
                ville: targetProject.city || '',
                regimeMatrimonial: '',
                societe: '',
                nomCompteSociete: '',
                enQualiteDe: '',
                nomMiseADisposition: '',
                nomExploitant: '',
                adresseProjet: '',
                parcelle1: '',
                parcelle2: '',
                parcelle3: '',
                parcelle4: '',
                parcelle5: '',
                parcelle6: '',
                usageParcelle: '',
                usageParcelle2: '',
                conditionsParticulieres: '',
                croixOuiICPE: 'X',
                croixNonICPE: 'X',
                hauteurSabliere: targetProject.eaveHeight || '',
                largeur: targetProject.width || '',
                longueur: targetProject.length || '',
                surface: targetProject.surface || '',
                faitA: '',
                lieu: '',
                champLibre1: '',
                champLibre2: '',
                champLibre3: '',
                champLibre4: ''
            });
        }
    }, [targetProject, setProject]);

    // Calcul surface
    useEffect(() => {
        const l = parseFloat(clientData.largeur);
        const L = parseFloat(clientData.longueur);
        if (!isNaN(l) && !isNaN(L)) {
            setClientData(prev => ({ ...prev, surface: (l * L).toFixed(2) }));
        }
    }, [clientData.largeur, clientData.longueur]);

    // Templates
    const availableTemplates = [
        { id: 'dp_dossier', name: 'Déclaration Préalable (DP) - Dossier Complet', category: 'Urbanisme' },
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

    // Chargement document PDF
    const handleUploadTemplate = (templateId, templateName) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (file) {
                try {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = reader.result;

                        // Ouvrir le modal avec PDFViewer
                        setTagEditorModal({
                            templateId,
                            templateName,
                            fileName: file.name,
                            pdfData: base64,
                            placedTags: uploadedTemplates[templateId]?.tags || []
                        });
                    };
                    reader.readAsDataURL(file);
                } catch (error) {
                    toast({
                        variant: "destructive",
                        title: "Erreur",
                        description: "Impossible de charger le PDF"
                    });
                }
            }
        };
        input.click();
    };

    // Édition d'un template existant
    const handleEditTemplate = (templateId, templateName) => {
        const uploadedTemplate = uploadedTemplates[templateId];
        if (!uploadedTemplate) return;

        setTagEditorModal({
            templateId,
            templateName,
            fileName: uploadedTemplate.fileName,
            pdfData: uploadedTemplate.pdfData,
            placedTags: uploadedTemplate.tags || []
        });
    };

    // Placement d'une balise
    const handleTagPlaced = (tag) => {
        setTagEditorModal(prev => ({
            ...prev,
            placedTags: [...prev.placedTags, tag]
        }));
        setSelectedTagForPlacement(null);
    };

    // Suppression d'une balise
    const handleTagRemoved = (tagToRemove) => {
        setTagEditorModal(prev => ({
            ...prev,
            placedTags: prev.placedTags.filter(t =>
                !(t.key === tagToRemove.key && t.page === tagToRemove.page && t.x === tagToRemove.x && t.y === tagToRemove.y)
            )
        }));
    };

    // Déplacement d'une balise
    const handleTagMoved = (tagToMove, newPosition) => {
        setTagEditorModal(prev => ({
            ...prev,
            placedTags: prev.placedTags.map(t =>
                (t.id && t.id === tagToMove.id)
                    ? { ...t, x: newPosition.x, y: newPosition.y }
                    : t
            )
        }));
    };

    // Sauvegarde configuration balises
    const handleSaveTagConfiguration = () => {
        if (!tagEditorModal) return;

        const newTemplates = {
            ...uploadedTemplates,
            [tagEditorModal.templateId]: {
                fileName: tagEditorModal.fileName,
                pdfData: tagEditorModal.pdfData,
                tags: tagEditorModal.placedTags,
                uploadedAt: new Date().toISOString()
            }
        };

        setUploadedTemplates(newTemplates);
        localStorage.setItem('cdp_uploaded_templates', JSON.stringify(newTemplates));

        toast({
            title: "Configuration sauvegardée",
            description: `${tagEditorModal.placedTags.length} balise(s) enregistrée(s)`,
            className: "bg-green-50 border-green-200"
        });

        setTagEditorModal(null);
        setSelectedTagForPlacement(null);
    };

    // Génération PDF unitaire (Helper)
    const generatePdf = async (templateId) => {
        const uploadedTemplate = uploadedTemplates[templateId];
        if (!uploadedTemplate) throw new Error("Template manquant");

        const existingPdfBytes = await fetch(uploadedTemplate.pdfData).then(r => r.arrayBuffer());
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        for (const tag of uploadedTemplate.tags) {
            const page = pdfDoc.getPage(tag.page - 1);
            const { width, height } = page.getSize();
            const x = (tag.x / 100) * width;
            const y = height - ((tag.y / 100) * height);
            const tagValue = availableTags.find(t => t.key === tag.key)?.value() || '';
            page.drawText(tagValue, { x, y, size: 10, font, color: rgb(0, 0, 0) });
        }

        const pdfBytes = await pdfDoc.save();
        return new Blob([pdfBytes], { type: 'application/pdf' });
    };

    const [isMerged, setIsMerged] = useState(false);

    // ... (generatePdf helper remains same)

    // Génération documents avec pdf-lib
    const handleGenerateDocuments = async () => {
        if (selectedTemplates.length === 0) {
            toast({ variant: "destructive", title: "Aucun template", description: "Sélectionnez au moins un document." });
            return;
        }

        try {
            const generated = [];

            if (isMerged) {
                // Mode Regroupé
                const mergedPdf = await PDFDocument.create();

                for (const templateId of selectedTemplates) {
                    const blob = await generatePdf(templateId);
                    const arrayBuffer = await blob.arrayBuffer();
                    const srcDoc = await PDFDocument.load(arrayBuffer);
                    const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
                    copiedPages.forEach((page) => mergedPdf.addPage(page));
                }

                const pdfBytes = await mergedPdf.save();
                const mergedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
                const fileName = `Dossier_Complet_${clientData.nom || 'Client'}.pdf`;

                // Download
                const link = document.createElement('a');
                link.href = URL.createObjectURL(mergedBlob);
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                generated.push({ id: 'merged', name: fileName, blob: mergedBlob });

            } else {
                // Mode Séparé
                for (const templateId of selectedTemplates) {
                    const template = availableTemplates.find(t => t.id === templateId);
                    
                    let blob;
                    if (templateId === 'dp_dossier') {
                        // Cas spécial DP
                        if (!targetProject?.urbanisme_captures) {
                            toast({ 
                                variant: "destructive", 
                                title: "Captures manquantes", 
                                description: "Veuillez d'abord réaliser les captures dans l'Éditeur (Onglet Urbanisme) pour ce projet." 
                            });
                            continue;
                        }

                        toast({ title: "Génération DP...", description: "Veuillez patienter, rendu des planches en cours." });
                        
                        // Sécuriser et précharger les images via le proxy
                        const safeTargetProject = await preloadProjectImages(targetProject);

                        // Attendre un peu que le DOM masqué soit prêt si on vient de changer de projet
                        await new Promise(r => setTimeout(r, 600));
                        
                        const plates = {};
                        const plateIds = ['dp-plate-situation', 'dp-plate-masse', 'dp-plate-notice'];
                        for (const id of plateIds) {
                            const el = document.getElementById(id);
                            if (el) {
                                const canvas = await html2canvas(el, { 
                                    scale: 2,
                                    useCORS: true,
                                    allowTaint: false,
                                    logging: false,
                                    imageTimeout: 15000
                                });
                                plates[id] = canvas.toDataURL('image/png');
                            }
                        }

                        const { generateDPDossier } = await import("@/services/DPGeneratorService");
                        // On injecte les données du formulaire CDP dans l'objet projet pour la génération
                        const projectWithForm = {
                            ...safeTargetProject,
                            ...clientData,
                            name: clientData.nom,
                            firstName: clientData.prenom,
                            address: clientData.adresse,
                            zip: clientData.codePostal,
                            city: clientData.ville
                        };
                        
                        await generateDPDossier(projectWithForm, plates);
                        continue; 
                    } else {
                        // Cas général templates PDF
                        blob = await generatePdf(templateId);
                    }

                    // Download
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${template.name}_${clientData.nom || 'Client'}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                    generated.push({ id: template.id, name: template.name, blob: blob });
                }
            }

            if (generated.length > 0) {
                setGeneratedDocuments(generated);
                toast({
                    title: "Documents générés",
                    description: isMerged ? "Dossier complet généré" : `${generated.length} documents générés`,
                    className: "bg-green-50 border-green-200"
                });
            }

        } catch (error) {
            console.error('Erreur génération:', error);
            toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue lors de la génération." });
        }
    };

    // Signature DocuSign
    const handleSignDocument = async (doc) => {
        try {
            toast({ title: "Préparation de la signature...", description: "Veuillez patienter." });

            // Use stored blob if available (for merged docs), else regenerate
            const blob = doc.blob || await generatePdf(doc.id);

            // Infos signataire
            const signerInfo = {
                email: clientData.email,
                name: `${clientData.prenom} ${clientData.nom}`
            };

            if (!signerInfo.email) {
                toast({ variant: "destructive", title: "Email manquant", description: "L'email du client est requis." });
                return;
            }

            const url = await signDocument(blob, signerInfo, doc.name);

            // Ouvrir DocuSign
            window.open(url, '_blank');

        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erreur DocuSign", description: error.message });
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

                {/* CONTENT AREA */}
                <div className="grid grid-cols-3 gap-8 items-stretch">

                    {/* ========== VOLET 1 : CLIENT ========== */}
                    <Card className="flex flex-col h-full min-h-[800px]">
                        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shrink-0">
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Client
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4 flex-1">

                            {/* ... Content ... */}
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

                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Né(e) à"
                                        value={clientData.neA}
                                        onChange={(e) => setClientData({ ...clientData, neA: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Né(e) le"
                                        value={clientData.neLe}
                                        onChange={(e) => setClientData({ ...clientData, neLe: e.target.value })}
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
                                    placeholder="Régime matrimonial"
                                    value={clientData.regimeMatrimonial}
                                    onChange={(e) => setClientData({ ...clientData, regimeMatrimonial: e.target.value })}
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

                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Nom mise à disposition"
                                        value={clientData.nomMiseADisposition}
                                        onChange={(e) => setClientData({ ...clientData, nomMiseADisposition: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Nom exploitant"
                                        value={clientData.nomExploitant}
                                        onChange={(e) => setClientData({ ...clientData, nomExploitant: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>

                                <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wide pt-4 border-t">Informations Société</h3>

                                <input
                                    type="text"
                                    placeholder="Société"
                                    value={clientData.societe}
                                    onChange={(e) => setClientData({ ...clientData, societe: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />

                                <input
                                    type="text"
                                    placeholder="Nom pour le compte de la société"
                                    value={clientData.nomCompteSociete}
                                    onChange={(e) => setClientData({ ...clientData, nomCompteSociete: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />

                                <input
                                    type="text"
                                    placeholder="En qualité de"
                                    value={clientData.enQualiteDe}
                                    onChange={(e) => setClientData({ ...clientData, enQualiteDe: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />

                                <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wide pt-4 border-t">Informations Projet</h3>

                                <input
                                    type="text"
                                    placeholder="Adresse projet"
                                    value={clientData.adresseProjet}
                                    onChange={(e) => setClientData({ ...clientData, adresseProjet: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />

                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="Parcelle 1" value={clientData.parcelle1} onChange={(e) => setClientData({ ...clientData, parcelle1: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                    <input type="text" placeholder="Parcelle 2" value={clientData.parcelle2} onChange={(e) => setClientData({ ...clientData, parcelle2: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                    <input type="text" placeholder="Parcelle 3" value={clientData.parcelle3} onChange={(e) => setClientData({ ...clientData, parcelle3: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                    <input type="text" placeholder="Parcelle 4" value={clientData.parcelle4} onChange={(e) => setClientData({ ...clientData, parcelle4: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                    <input type="text" placeholder="Parcelle 5" value={clientData.parcelle5} onChange={(e) => setClientData({ ...clientData, parcelle5: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                    <input type="text" placeholder="Parcelle 6" value={clientData.parcelle6} onChange={(e) => setClientData({ ...clientData, parcelle6: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="Usage de la parcelle 1" value={clientData.usageParcelle} onChange={(e) => setClientData({ ...clientData, usageParcelle: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                    <input type="text" placeholder="Usage de la parcelle 2" value={clientData.usageParcelle2} onChange={(e) => setClientData({ ...clientData, usageParcelle2: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                </div>

                                <textarea placeholder="Conditions particulières" value={clientData.conditionsParticulieres} onChange={(e) => setClientData({ ...clientData, conditionsParticulieres: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2">
                                        <input type="text" value={clientData.croixOuiICPE} onChange={(e) => setClientData({ ...clientData, croixOuiICPE: e.target.value })} className="w-12 px-2 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-center" />
                                        <span className="text-sm text-slate-700">Choix ICPE Oui</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="text" value={clientData.croixNonICPE} onChange={(e) => setClientData({ ...clientData, croixNonICPE: e.target.value })} className="w-12 px-2 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-center" />
                                        <span className="text-sm text-slate-700">Choix ICPE Non</span>
                                    </div>
                                </div>

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

                                {/* Champs Libres */}
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Date"
                                        value={clientData.date}
                                        onChange={(e) => setClientData({ ...clientData, date: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Fait à"
                                        value={clientData.faitA}
                                        onChange={(e) => setClientData({ ...clientData, faitA: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Champ libre 1"
                                        value={clientData.champLibre1}
                                        onChange={(e) => setClientData({ ...clientData, champLibre1: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Champ libre 2"
                                        value={clientData.champLibre2}
                                        onChange={(e) => setClientData({ ...clientData, champLibre2: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Champ libre 3"
                                        value={clientData.champLibre3}
                                        onChange={(e) => setClientData({ ...clientData, champLibre3: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Champ libre 4"
                                        value={clientData.champLibre4}
                                        onChange={(e) => setClientData({ ...clientData, champLibre4: e.target.value })}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ========== VOLET 2 : DOCUMENT ========== */}
                    <Card className="flex flex-col h-full min-h-[800px]">
                        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white shrink-0">
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Documents
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4 flex-1">

                            <div className="flex items-center space-x-2 mb-4">
                                <input
                                    type="checkbox"
                                    id="mergeDocs"
                                    checked={isMerged}
                                    onChange={(e) => setIsMerged(e.target.checked)}
                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                />
                                <label
                                    htmlFor="mergeDocs"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700"
                                >
                                    Grouper les documents en un seul fichier
                                </label>
                            </div>

                            <Button
                                onClick={handleGenerateDocuments}
                                disabled={selectedTemplates.length === 0}
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
                                                                ✓ {uploadedTemplates[template.id].fileName} ({(uploadedTemplates[template.id].tags || []).length} balises)
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    {uploadedTemplates[template.id] && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-blue-300 text-blue-700 hover:bg-blue-50 flex-shrink-0"
                                                            onClick={() => handleEditTemplate(template.id, template.name)}
                                                        >
                                                            <Edit className="w-3 h-3 mr-1" />
                                                            Modifier
                                                        </Button>
                                                    )}
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
                    <Card className="flex flex-col h-full min-h-[800px]">
                        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white shrink-0">
                            <CardTitle className="flex items-center gap-2">
                                <Send className="w-5 h-5" />
                                Docusign
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4 flex-1">

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
                                        <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wide">Documents à signer</h3>

                                        <div className="space-y-2">
                                            {generatedDocuments.map((doc, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white shadow-sm">
                                                    <span className="text-sm font-medium text-slate-700 truncate" title={doc.name}>
                                                        {doc.name}
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white shadow-md transition-all active:scale-95"
                                                        onClick={() => handleSignDocument(doc)}
                                                    >
                                                        <Send className="w-3 h-3 mr-2" />
                                                        Préparer l'envoi
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <div className="flex items-start gap-2 text-xs text-slate-500">
                                                <User className="w-4 h-4 text-slate-400 mt-0.5" />
                                                <div>
                                                    <span className="font-medium text-slate-700">Destinataire :</span>
                                                    <br />
                                                    {clientData.email || 'Email manquant'}
                                                </div>
                                            </div>
                                        </div>
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

            {/* ========== MODAL ÉDITEUR AVEC PDFVIEWER ========== */}
            {tagEditorModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[92vh] flex flex-col">

                        {/* Header */}
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-bold">Configuration des Balises</h3>
                                <p className="text-purple-100 text-sm mt-1">{tagEditorModal.templateName}</p>
                                <p className="text-purple-200 text-xs mt-1">📎 {tagEditorModal.fileName}</p>
                            </div>
                            <button
                                onClick={() => { setTagEditorModal(null); setSelectedTagForPlacement(null); }}
                                className="text-white hover:bg-purple-600 p-2 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body: PDF Viewer + Balises */}
                        <div className="flex-1 flex overflow-hidden">

                            {/* PDF Viewer (70%) */}
                            <div className="flex-[7] border-r">
                                <PDFViewer
                                    pdfData={tagEditorModal.pdfData}
                                    placedTags={tagEditorModal.placedTags}
                                    selectedTag={selectedTagForPlacement}
                                    onTagPlaced={handleTagPlaced}
                                    onTagRemoved={handleTagRemoved}
                                    onTagMoved={handleTagMoved}
                                    availableTags={availableTags}
                                />
                            </div>

                            {/* Liste Balises (30%) */}
                            <div className="flex-[3] p-6 overflow-y-auto bg-slate-50">
                                <h4 className="font-semibold text-slate-700 mb-4">Balises Disponibles</h4>
                                <p className="text-xs text-slate-600 mb-4">Cliquez sur une balise puis cliquez sur le PDF pour la placer</p>

                                <div className="space-y-2">
                                    {availableTags.map(tag => (
                                        <button
                                            key={tag.key}
                                            onClick={() => setSelectedTagForPlacement(tag.key)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition ${selectedTagForPlacement === tag.key
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-white border-slate-300 hover:border-purple-400 hover:bg-purple-50'
                                                }`}
                                        >
                                            <code className="font-mono text-xs block">{tag.key}</code>
                                            <span className="text-xs opacity-75">{tag.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {tagEditorModal.placedTags.length > 0 && (
                                    <div className="mt-6 p-4 bg-purple-100 border border-purple-300 rounded-lg">
                                        <h5 className="font-semibold text-purple-900 text-sm mb-2">Balises placées</h5>
                                        <p className="text-xs text-purple-700">{tagEditorModal.placedTags.length} balise(s)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-slate-50 p-6 rounded-b-2xl border-t flex gap-4">
                            <Button
                                variant="outline"
                                onClick={() => { setTagEditorModal(null); setSelectedTagForPlacement(null); }}
                                className="flex-1"
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={handleSaveTagConfiguration}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Sauvegarder
                            </Button>
                        </div>

                    </div>
                </div>
            )}
            {/* Hidden container for actual rendering of DP plates */}
            <div className="fixed left-[-9999px] top-0 pointer-events-none">
                {targetProject && (
                    <>
                        <PlateSituation project={targetProject} captures={targetProject.urbanisme_captures} />
                        <PlateMasse project={targetProject} captures={targetProject.urbanisme_captures} />
                        <PlateNotice project={targetProject} captures={targetProject.urbanisme_captures} />
                    </>
                )}
            </div>
        </div>
    );
}
