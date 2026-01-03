import React, { useState, useEffect, useMemo } from 'react';
import { PDFViewer } from '@/components/PDFViewer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { X, Upload, Download, Plus, FileText, Search, User, MapPin, Ruler, Image as ImageIcon, ChevronDown, ChevronRight, Phone, Mail } from 'lucide-react';
import { useProjects } from '@/contexts/ProjectContext';

const STORAGE_KEY = 'configurator_offer_template';

import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "@/config/firebase.js";

export function OfferGenerationModal({ isOpen, onClose, config, generatedImages }) {
    const { projects } = useProjects();

    // Global State
    const [templateData, setTemplateData] = useState(null); // { pdfData, tags: [] }
    const [selectedTagKey, setSelectedTagKey] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [projectCaptureImg, setProjectCaptureImg] = useState(null); // New State

    // Project Selection
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [showProjectResults, setShowProjectResults] = useState(false);

    // Manual Values
    const [manualValues, setManualValues] = useState({
        contactName: '',
        contactPhone: '',
        contactEmail: ''
    });

    // Accordion State
    const [openSections, setOpenSections] = useState({
        project: true,
        building: true,
        contact: true,
        visuals: true
    });

    const toggleSection = (sec) => setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));

    // Helper: Fetch Image via Proxy (Replicated from Configurateur.jsx)
    const fetchImageViaProxy = async (url) => {
        if (!url) return null;
        if (url.startsWith('data:')) return url;

        if (url.startsWith('http') || url.startsWith('gs://')) {
            try {
                if (!storage) throw new Error("Storage non initialisé");
                const storageRef = ref(storage, url);
                const downloadURL = await getDownloadURL(storageRef);
                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(downloadURL)}`;

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
                const response = await fetch(proxyUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`Proxy Error: ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                let binary = '';
                const bytes = new Uint8Array(arrayBuffer);
                for (let k = 0; k < bytes.byteLength; k++) binary += String.fromCharCode(bytes[k]);
                return `data:image/png;base64,${window.btoa(binary)}`;
            } catch (e) {
                console.error("Erreur téléchargement image:", e);
                return null;
            }
        }
        return null;
    };

    // --- INITIALIZATON ---
    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    setTemplateData(JSON.parse(saved));
                } catch (e) {
                    console.error("Error loading template", e);
                }
            }
        }
    }, [isOpen]);

    // Fetch capture when selectedProject changes
    useEffect(() => {
        const loadCapture = async () => {
            if (selectedProject?.captures?.length > 0) {
                const url = selectedProject.captures[0]; // First capture
                const imgData = await fetchImageViaProxy(url);
                setProjectCaptureImg(imgData);
            } else {
                setProjectCaptureImg(null);
            }
        };
        loadCapture();
    }, [selectedProject]);

    // --- DATA MAPPING ---
    const getProjectValue = (field) => {
        if (!selectedProject) return '';
        switch (field) {
            case 'name': return selectedProject.name || '';
            case 'address': return selectedProject.address || '';
            case 'zip': return selectedProject.zip || '';
            case 'city': return selectedProject.city || '';
            default: return '';
        }
    };

    const getConfigValue = (field) => {
        if (!config) return '';
        const effectiveWidth = config.width
            + (config.leftSide === 'appentis' ? 9.3 : (config.leftSide === 'auvent' ? 4.0 : 0))
            + (config.rightSide === 'appentis' ? 9.3 : (config.rightSide === 'auvent' ? 4.0 : 0));

        switch (field) {
            case 'width': return effectiveWidth;
            case 'length': return config.length;
            case 'surface': return (effectiveWidth * config.length).toFixed(0);
            case 'eaveHeight': return config.eaveHeight;
            case 'ridgeHeight': return config.ridgeHeight; // You might need to calculate this if not in config
            case 'roofPitch': return config.roofPitch;
            case 'bayCount': return config.bayCount;
            case 'baySpacing': return config.baySpacing;
            default: return '';
        }
    };

    // --- TAG DEFINITIONS ---
    const availableTags = useMemo(() => [
        // Project
        { category: 'project', key: '{{project_name}}', label: 'Nom Projet', value: getProjectValue('name'), icon: User },
        { category: 'project', key: '{{project_address}}', label: 'Adresse', value: getProjectValue('address'), icon: MapPin },
        { category: 'project', key: '{{project_zip}}', label: 'Code Postal', value: getProjectValue('zip'), icon: MapPin },
        { category: 'project', key: '{{project_city}}', label: 'Ville', value: getProjectValue('city'), icon: MapPin },

        // Building
        { category: 'building', key: '{{b_dims}}', label: 'Dimensions (Lxl)', value: `${getConfigValue('length')}m x ${getConfigValue('width').toFixed(2)} m`, icon: Ruler },
        { category: 'building', key: '{{b_surface}}', label: 'Surface', value: `${getConfigValue('surface')} m²`, icon: Ruler },
        { category: 'building', key: '{{b_eave}}', label: 'Hauteur Sablière', value: `${getConfigValue('eaveHeight')} m`, icon: Ruler },
        { category: 'building', key: '{{b_ridge}}', label: 'Hauteur Faitage', value: `${getConfigValue('ridgeHeight') || '?'} m`, icon: Ruler }, // config.ridgeHeight might need calculation
        { category: 'building', key: '{{b_pitch}}', label: 'Pente', value: `${getConfigValue('roofPitch')}°`, icon: Ruler },
        { category: 'building', key: '{{b_bays}}', label: 'Travées', value: `${getConfigValue('bayCount')} x ${getConfigValue('baySpacing')} m`, icon: Ruler },

        // Contact
        { category: 'contact', key: '{{contact_name}}', label: 'Nom Contact', value: manualValues.contactName, icon: User },
        { category: 'contact', key: '{{contact_phone}}', label: 'Téléphone', value: manualValues.contactPhone, icon: Phone },
        { category: 'contact', key: '{{contact_email}}', label: 'Email', value: manualValues.contactEmail, icon: Mail },

        // Visuals (Placeholders)
        { category: 'visuals', key: '{{img_2d}}', label: 'Vue 2D', value: '[Image Vue 2D]', icon: ImageIcon },
        { category: 'visuals', key: '{{img_capture}}', label: 'Capture Projet', value: '[Image Capture]', icon: ImageIcon },
    ], [selectedProject, config, manualValues]);

    const currentSelectedTag = selectedTagKey ? availableTags.find(t => t.key === selectedTagKey) : null;

    // --- HANDLERS ---
    const handleTagMoved = (tag, newPos) => {
        const updatedTags = templateData.tags.map(t =>
            t.id === tag.id ? { ...t, x: newPos.x, y: newPos.y } : t
        );
        const newData = { ...templateData, tags: updatedTags };
        setTemplateData(newData);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        } catch (e) {
            console.warn("Storage update failed on move via drag");
            // Non-critical, just won't save if reload
        }
    };

    // --- HANDLERS ---
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file || file.type !== 'application/pdf') return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const newData = { pdfData: ev.target.result, tags: [] };
            setTemplateData(newData);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
            } catch (error) {
                console.error("LocalStorage Error:", error);
                alert("Le fichier PDF est trop volumineux pour être sauvegardé dans le navigateur. Il sera utilisable pour cette session, mais devra être rechargé la prochaine fois.");
            }
        };
        reader.readAsDataURL(file);
    };

    const handleTagPlaced = (newTag) => {
        // Tag placed on PDF
        const updatedTags = [...(templateData.tags || []), newTag];
        const newData = { ...templateData, tags: updatedTags };
        setTemplateData(newData);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        } catch (e) {
            console.warn("Storage update failed on place");
        }
        setSelectedTagKey(null); // Deselect after placement
    };

    const handleTagRemoved = (tagOrId) => {
        const id = tagOrId.id || tagOrId; // Handle object or ID
        const updatedTags = templateData.tags.filter(t => t.id !== id);
        const newData = { ...templateData, tags: updatedTags };
        setTemplateData(newData);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        } catch (e) {
            console.warn("Storage update failed on remove");
        }
    };

    const handleGeneratePDF = async () => {
        if (!templateData?.pdfData) return;
        setIsGenerating(true);
        try {
            const pdfDoc = await PDFDocument.load(templateData.pdfData);
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const pages = pdfDoc.getPages();

            // Iterate over placed tags
            for (const tag of templateData.tags) {
                const page = pages[tag.page - 1];
                if (!page) continue;

                // The PDFViewer passes x/y as percentages (0-100) of the page dimensions.
                // PDF-lib uses points, with origin at bottom-left.
                const { width, height } = page.getSize();
                const x = (tag.x / 100) * width;
                const y = height - ((tag.y / 100) * height); // Convert from top-left origin to bottom-left

                // Handle Images
                if (tag.key === '{{img_2d}}' && generatedImages?.img3D) {
                    const img = await pdfDoc.embedPng(generatedImages.img3D);
                    // Decreased by further 20% from 320 -> 256
                    const imgDims = img.scaleToFit(256, 192);

                    page.drawImage(img, {
                        x: x,
                        y: y - imgDims.height,
                        width: imgDims.width,
                        height: imgDims.height,
                    });
                    continue;
                }

                // Use projectCaptureImg if available, fallback to mapImg from props (if any)
                const captureToUse = projectCaptureImg || generatedImages?.mapImg;

                if (tag.key === '{{img_capture}}' && captureToUse) {
                    const img = await pdfDoc.embedPng(captureToUse);
                    // Increased by 80% from 300 -> 540
                    const captureDims = img.scaleToFit(540, 405);

                    page.drawImage(img, {
                        x: x,
                        y: y - captureDims.height,
                        width: captureDims.width,
                        height: captureDims.height,
                    });
                    continue;
                }


                // Find Value
                const def = availableTags.find(t => t.key === tag.key);
                const textToDraw = def ? String(def.value) : tag.label;

                page.drawText(textToDraw, {
                    x: x,
                    y: y, // Adjust for baseline 
                    size: 11, // Slightly smaller
                    font: helveticaFont,
                    color: rgb(0, 15 / 255, 82 / 255), // #000f52
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Offre_${selectedProject?.name || 'Projet'}.pdf`;
            link.click();

        } catch (err) {
            console.error(err);
            alert("Erreur lors de la génération : " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // Filter projects
    const filteredProjects = useMemo(() => {
        if (!searchTerm) return [];
        const lower = searchTerm.toLowerCase();
        return projects.filter(p =>
            (p.name && p.name.toLowerCase().includes(lower)) ||
            (p.firstName && p.firstName.toLowerCase().includes(lower)) ||
            (p.city && p.city.toLowerCase().includes(lower))
        ).slice(0, 5);
    }, [projects, searchTerm]);


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 gap-0 bg-slate-50 overflow-hidden [&>button]:hidden">

                {/* HEADER */}
                <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-blue-600" />
                        <h2 className="text-xl font-bold text-slate-800">Générer l'Offre Commerciale</h2>
                    </div>
                    {/* Header Actions */}
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={onClose}>Fermer</Button>
                        <Button
                            onClick={handleGeneratePDF}
                            disabled={!templateData?.pdfData || isGenerating}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        >
                            <Download className="w-4 h-4" />
                            {isGenerating ? 'Génération...' : 'Télécharger le PDF'}
                        </Button>
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div className="flex flex-1 overflow-hidden">

                    {/* --- LEFT PANEL: DATA & TAGS --- */}
                    <div className="w-[500px] flex flex-col border-r border-slate-200 bg-white z-10 shadow-sm overflow-y-auto">

                        {/* 1. Project Search */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                                Sélectionner un Projet
                            </Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Rechercher (Nom, Ville)..."
                                    className="pl-9 bg-white"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setShowProjectResults(true);
                                    }}
                                    onFocus={() => setShowProjectResults(true)}
                                    onBlur={() => setTimeout(() => setShowProjectResults(false), 100)} // Delay to allow click
                                />
                                {showProjectResults && searchTerm && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                                        {filteredProjects.map(p => (
                                            <div
                                                key={p.id}
                                                className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-200 last:border-0"
                                                onMouseDown={(e) => { // Use onMouseDown to prevent blur before click
                                                    e.preventDefault();
                                                    setSelectedProject(p);
                                                    setSearchTerm(p.name);
                                                    setShowProjectResults(false);
                                                }}
                                            >
                                                <div className="font-medium text-slate-800">{p.name} {p.firstName}</div>
                                                <div className="text-xs text-slate-500">{p.city} ({p.zip})</div>
                                            </div>
                                        ))}
                                        {filteredProjects.length === 0 && (
                                            <div className="p-3 text-sm text-slate-400 text-center">Aucun résultat</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Sections */}
                        <div className="p-2 space-y-2">

                            {/* Project Info */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <button
                                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                                    onClick={() => toggleSection('project')}
                                >
                                    <span className="font-semibold text-slate-700 flex items-center gap-2">
                                        <User className="w-4 h-4 text-blue-500" />
                                        Projet
                                    </span>
                                    {openSections.project ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                </button>
                                {openSections.project && (
                                    <div className="p-3 space-y-3 bg-white">
                                        {availableTags.filter(t => t.category === 'project').map(tag => (
                                            <div key={tag.key} className="flex items-center gap-2 group">
                                                <div className="flex-1">
                                                    <label className="text-xs text-slate-500 block">{tag.label}</label>
                                                    <div className="text-sm font-medium text-slate-800 truncate" title={tag.value}>{tag.value || '-'}</div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant={selectedTagKey === tag.key ? "default" : "outline"}
                                                    className={`h-8 w-8 p-0 ${selectedTagKey === tag.key ? 'bg-blue-600' : 'hover:border-blue-400 hover:text-blue-600'}`}
                                                    onClick={() => setSelectedTagKey(tag.key)}
                                                    title="Placer sur le document"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Building Info */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <button
                                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                                    onClick={() => toggleSection('building')}
                                >
                                    <span className="font-semibold text-slate-700 flex items-center gap-2">
                                        <Ruler className="w-4 h-4 text-amber-500" />
                                        Bâtiment (Configurateur)
                                    </span>
                                    {openSections.building ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                </button>
                                {openSections.building && (
                                    <div className="p-3 space-y-3 bg-white">
                                        {availableTags.filter(t => t.category === 'building').map(tag => (
                                            <div key={tag.key} className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <label className="text-xs text-slate-500 block">{tag.label}</label>
                                                    <div className="text-sm font-medium text-slate-800">{tag.value || '-'}</div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant={selectedTagKey === tag.key ? "default" : "outline"}
                                                    className={`h-8 w-8 p-0 ${selectedTagKey === tag.key ? 'bg-blue-600' : 'hover:border-blue-400 hover:text-blue-600'}`}
                                                    onClick={() => setSelectedTagKey(tag.key)}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Contact Info (Manual) */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <button
                                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                                    onClick={() => toggleSection('contact')}
                                >
                                    <span className="font-semibold text-slate-700 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-green-500" />
                                        Contact (Champs Libres)
                                    </span>
                                    {openSections.contact ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                </button>
                                {openSections.contact && (
                                    <div className="p-3 space-y-3 bg-white">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-500">Nom Contact</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={manualValues.contactName}
                                                    onChange={e => setManualValues(p => ({ ...p, contactName: e.target.value }))}
                                                    className="h-8 text-sm"
                                                    placeholder="Ex: M. Dupont"
                                                />
                                                <Button
                                                    size="sm" variant={selectedTagKey === '{{contact_name}}' ? "default" : "outline"}
                                                    className="h-8 w-8 p-0" onClick={() => setSelectedTagKey('{{contact_name}}')}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-500">Téléphone</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={manualValues.contactPhone}
                                                    onChange={e => setManualValues(p => ({ ...p, contactPhone: e.target.value }))}
                                                    className="h-8 text-sm"
                                                    placeholder="06..."
                                                />
                                                <Button
                                                    size="sm" variant={selectedTagKey === '{{contact_phone}}' ? "default" : "outline"}
                                                    className="h-8 w-8 p-0" onClick={() => setSelectedTagKey('{{contact_phone}}')}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-500">Email</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={manualValues.contactEmail}
                                                    onChange={e => setManualValues(p => ({ ...p, contactEmail: e.target.value }))}
                                                    className="h-8 text-sm"
                                                    placeholder="@..."
                                                />
                                                <Button
                                                    size="sm" variant={selectedTagKey === '{{contact_email}}' ? "default" : "outline"}
                                                    className="h-8 w-8 p-0" onClick={() => setSelectedTagKey('{{contact_email}}')}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Visuals */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <button
                                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                                    onClick={() => toggleSection('visuals')}
                                >
                                    <span className="font-semibold text-slate-700 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-purple-500" />
                                        Visuels
                                    </span>
                                    {openSections.visuals ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                </button>
                                {openSections.visuals && (
                                    <div className="p-3 space-y-3 bg-white">
                                        <p className="text-xs text-slate-400 italic mb-2">Cliquez pour placer (Images placeholder)</p>
                                        {availableTags.filter(t => t.category === 'visuals').map(tag => (
                                            <div key={tag.key} className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <label className="text-xs text-slate-500 block">{tag.label}</label>
                                                    <div className="text-sm font-medium text-slate-800">{tag.value}</div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant={selectedTagKey === tag.key ? "default" : "outline"}
                                                    className={`h-8 w-8 p-0 ${selectedTagKey === tag.key ? 'bg-blue-600' : 'hover:border-blue-400 hover:text-blue-600'}`}
                                                    onClick={() => setSelectedTagKey(tag.key)}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* --- RIGHT PANEL: PDF VIEWER --- */}
                    <div className="flex-1 bg-slate-100 relative flex flex-col h-full">
                        {!templateData?.pdfData ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                <div className="bg-white p-12 rounded-3xl shadow-xl border-2 border-dashed border-slate-300 w-full max-w-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer relative group">
                                    <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Charger un modèle PDF</h3>
                                    <p className="text-slate-500">Cliquez ou glissez un fichier PDF ici pour commencer</p>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer z-50"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="absolute top-4 right-4 z-20">
                                    <div className="relative group">
                                        <Button className="bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm gap-2">
                                            <Upload className="w-4 h-4" />
                                            Changer le PDF
                                        </Button>
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-hidden relative p-4">
                                    <div className="h-full w-full bg-slate-200/50 rounded-xl overflow-hidden shadow-inner border border-slate-300 flex items-center justify-center">
                                        <PDFViewer
                                            pdfData={templateData.pdfData}
                                            placedTags={templateData.tags || []}
                                            selectedTag={currentSelectedTag} // Pass the full tag object
                                            onTagPlaced={handleTagPlaced}
                                            onTagRemoved={handleTagRemoved}
                                            onTagMoved={handleTagMoved}
                                            availableTags={[]} // We manage selection externally
                                        />
                                    </div>

                                    {/* Helper Overlay */}
                                    {selectedTagKey && (
                                        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-30 animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
                                            <Plus className="w-4 h-4" />
                                            <span>Cliquez sur le document pour placer : <strong>{currentSelectedTag?.label}</strong></span>
                                            <button onClick={() => setSelectedTagKey(null)} className="ml-2 hover:bg-blue-700 rounded-full p-1"><X className="w-3 h-3" /></button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
