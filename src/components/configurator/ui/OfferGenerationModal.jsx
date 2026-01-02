import React, { useState, useEffect, useMemo } from 'react';
import { PDFViewer } from '@/components/PDFViewer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { X, Upload, Save, Download, Plus, FileText, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'configurator_offer_template';

export function OfferGenerationModal({ isOpen, onClose, config, selectedProject }) {
    // --- STATE ---
    const [step, setStep] = useState('loading'); // loading -> upload -> editor -> input_values
    const [templateData, setTemplateData] = useState(null); // { pdfData: string(base64), tags: [], customTags: [] }
    const [selectedTagKey, setSelectedTagKey] = useState(null);

    // Custom Tag Creation
    const [newTagLabel, setNewTagLabel] = useState('');
    const [isCreatingTag, setIsCreatingTag] = useState(false);

    // Generation Values
    const [customTagValues, setCustomTagValues] = useState({});
    const [isGenerating, setIsGenerating] = useState(false);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setTemplateData(parsed);
                    setStep('editor');
                } catch (e) {
                    console.error("Error loading template", e);
                    setStep('upload');
                }
            } else {
                setStep('upload');
            }
        }
    }, [isOpen]);

    // --- AVAILABLE TAGS ---
    const systemTags = useMemo(() => [
        { key: '{{client_name}}', label: 'Nom Client' },
        { key: '{{client_address}}', label: 'Adresse Client' },
        { key: '{{date}}', label: 'Date du jour' },
        { key: '{{building_dims}}', label: 'Dimensions (LxS)' },
        { key: '{{building_surface}}', label: 'Surface (m²)' },
        { key: '{{eave_height}}', label: 'Hauteur Sablière' },
        { key: '{{ridge_height}}', label: 'Hauteur Faitage' },
        { key: '{{roof_pitch}}', label: 'Pente (%)' },
        { key: '{{total_price}}', label: 'Prix Total' }, // Make sure to handle if not available
    ], []);

    const allTags = useMemo(() => {
        const customs = templateData?.customTags || [];
        return [...systemTags, ...customs];
    }, [systemTags, templateData?.customTags]);

    // --- HANDLERS ---

    // 1. UPLOAD
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file || file.type !== 'application/pdf') return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result; // Data URL
            const newData = {
                pdfData: base64, // Keep full data url? PDFViewer expects ArrayBuffer or Uint8Array usually but pdfjs accepts strings. PDFViewer accepts 'pdfData' prop.
                // Checking PDFViewer.jsx: it passes pdfData to pdfjsLib.getDocument(pdfData).
                // pdfjs can handle data uri string.
                tags: [],
                customTags: []
            };

            // To be safe, let's keep it as Data URL.
            setTemplateData(newData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
            setStep('editor');
        };
        reader.readAsDataURL(file);
    };

    // 2. TAG MANAGEMENT
    const handleTagPlaced = (newTag) => {
        const updatedTags = [...(templateData.tags || []), newTag];
        updateTemplate({ tags: updatedTags });
        setSelectedTagKey(null); // Deselect after placing
    };

    const handleTagRemoved = (tagToRemove) => {
        const updatedTags = templateData.tags.filter(t => t.id !== tagToRemove.id);
        updateTemplate({ tags: updatedTags });
    };

    const handleTagMoved = (tagToUpdate, newPos) => {
        const updatedTags = templateData.tags.map(t =>
            t.id === tagToUpdate.id ? { ...t, x: newPos.x, y: newPos.y } : t
        );
        updateTemplate({ tags: updatedTags });
    };

    const createCustomTag = () => {
        if (!newTagLabel.trim()) return;
        const key = `{{${newTagLabel.trim().toLowerCase().replace(/\s+/g, '_')}}}`;
        const newCustomTag = { key, label: newTagLabel.trim() };

        const updatedCustoms = [...(templateData.customTags || []), newCustomTag];
        updateTemplate({ customTags: updatedCustoms });

        setNewTagLabel('');
        setIsCreatingTag(false);
    };

    const deleteCustomTag = (tagKey) => {
        // Remove from definitions
        const updatedCustoms = templateData.customTags.filter(t => t.key !== tagKey);
        // Remove placed instances
        const updatedTags = templateData.tags.filter(t => t.key !== tagKey);
        updateTemplate({ customTags: updatedCustoms, tags: updatedTags });
    };

    const updateTemplate = (updates) => {
        const newData = { ...templateData, ...updates };
        setTemplateData(newData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    };

    const resetTemplate = () => {
        if (confirm("Voulez-vous vraiment supprimer le template actuel ?")) {
            localStorage.removeItem(STORAGE_KEY);
            setTemplateData(null);
            setStep('upload');
        }
    };

    // 3. GENERATION FLOW
    const startGeneration = () => {
        // Initialize values for custom tags
        const initialValues = {};
        (templateData.customTags || []).forEach(t => {
            initialValues[t.key] = '';
        });
        setCustomTagValues(initialValues);
        setStep('input_values');
    };

    const generatePDF = async () => {
        setIsGenerating(true);
        try {
            // 1. Prepare Data
            const values = {
                // System Values
                '{{client_name}}': selectedProject ? `${selectedProject.name} ${selectedProject.firstName}` : 'Client Inconnu',
                '{{client_address}}': selectedProject ? `${selectedProject.address}, ${selectedProject.zip} ${selectedProject.city}` : '',
                '{{date}}': new Date().toLocaleDateString('fr-FR'),
                '{{building_dims}}': `${config.length}m x ${config.width}m`,
                '{{building_surface}}': ((config.length * config.width).toFixed(0)), // Simple calc
                '{{eave_height}}': `${config.eaveHeight}m`,
                '{{ridge_height}}': `${config.ridgeHeight}m`,
                '{{roof_pitch}}': `${config.roofPitch}°`,
                '{{total_price}}': 'Sur Devis', // Placeholder

                // Custom Values form Input Step
                ...customTagValues
            };

            // 2. Load PDF
            const existingPdfBytes = await fetch(templateData.pdfData).then(res => res.arrayBuffer());
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

            // 3. Draw Tags
            const pages = pdfDoc.getPages();

            for (const tag of templateData.tags) {
                const pageIndex = tag.page - 1;
                if (pageIndex < 0 || pageIndex >= pages.length) continue;

                const page = pages[pageIndex];
                const { width, height } = page.getSize();

                // Coord transformation: PDF origin is Bottom-Left. PDFViewer origin is Top-Left.
                // PDFViewer provides percentage (0-100).
                // X: (tag.x / 100) * width
                // Y: height - ((tag.y / 100) * height)

                const x = (tag.x / 100) * width;
                const y = height - ((tag.y / 100) * height);

                const text = values[tag.key] || ''; // Default to empty if missing

                // Adjustment for text height (approx centering)
                // Font size 10 -> ~7pt height?
                // Let's shift up slightly to match baseline?
                // PDFViewer usually places anchor at Top-Left of the element visually?
                // The viewer returns visual center or top-left?
                // In PDFViewer.jsx: `left: ${x}px`, `top: ${y}px`, `transform: 'translate(-50%, -100%)'` (Bottom-Middle anchor?)
                // Wait, PDFViewer uses `translate(-50%, -100%)`.
                // This means the point (tag.x, tag.y) corresponds to the **Bottom Middle** of the label div.
                // So the text should reside *above* that point? 
                // No, `translate(-50%, -100%)` shifts the div UP and LEFT.
                // So the point (left, top) is the BOTTOM CENTER of the div.
                // If I place a tag on a line, I click ON the line.
                // So the anchor point is where I clicked.

                // If I click on a line, I want the text BASELINE to be roughly there.
                // Helper: drawText draws from baseline.
                // So y should be roughly y.

                page.drawText(text, {
                    x: x,
                    y: y,
                    size: 10,
                    font,
                    color: rgb(0, 0, 0)
                });
            }

            // 4. Save & Download
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Offre_${selectedProject?.name || 'Projet'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Close after success? Or stay?
            // onClose(); 

        } catch (err) {
            console.error("Generation Error", err);
            alert("Erreur lors de la génération : " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* HEADER */}
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-400" />
                        Générateur d'Offre
                        {step === 'editor' && <span className="text-xs bg-blue-600 px-2 py-0.5 rounded ml-2">Éditeur</span>}
                    </h2>
                    <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-hidden relative bg-slate-100 flex">

                    {step === 'upload' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="bg-white p-12 rounded-3xl shadow-xl border-2 border-dashed border-slate-300 w-full max-w-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Charger un modèle PDF</h3>
                                <p className="text-slate-500">Cliquez ou glissez un fichier PDF ici pour commencer (Devis vierge, Trame...)</p>
                            </div>
                        </div>
                    )}

                    {step === 'editor' && templateData && (
                        <>
                            {/* PDF VIEWER (LEFT) */}
                            <div className="flex-[3] relative border-r border-slate-200">
                                <PDFViewer
                                    pdfData={templateData.pdfData}
                                    placedTags={templateData.tags || []}
                                    selectedTag={selectedTagKey}
                                    onTagPlaced={handleTagPlaced}
                                    onTagRemoved={handleTagRemoved}
                                    onTagMoved={handleTagMoved}
                                    availableTags={allTags}
                                />
                            </div>

                            {/* SIDEBAR (RIGHT) */}
                            <div className="flex-1 bg-white p-4 overflow-y-auto flex flex-col gap-6 w-80 shrink-0">

                                {/* Actions */}
                                <div className="space-y-2">
                                    <Button onClick={startGeneration} className="w-full bg-blue-600 hover:bg-blue-700">
                                        <Download className="w-4 h-4 mr-2" />
                                        Générer le PDF
                                    </Button>
                                    <Button onClick={resetTemplate} variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Changer de modèle
                                    </Button>
                                </div>

                                <hr className="border-slate-100" />

                                {/* System Tags */}
                                <div>
                                    <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Données Système</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {systemTags.map(tag => (
                                            <button
                                                key={tag.key}
                                                onClick={() => setSelectedTagKey(tag.key)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedTagKey === tag.key
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                                                    }`}
                                            >
                                                {tag.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Tags */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Champs Personnalisés</h4>
                                        <button
                                            onClick={() => setIsCreatingTag(!isCreatingTag)}
                                            className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {isCreatingTag && (
                                        <div className="flex gap-2 mb-3 animate-in fade-in slide-in-from-top-2">
                                            <Input
                                                value={newTagLabel}
                                                onChange={e => setNewTagLabel(e.target.value)}
                                                placeholder="Label (ex: Remise)"
                                                className="h-8 text-xs"
                                                autoFocus
                                                onKeyDown={e => e.key === 'Enter' && createCustomTag()}
                                            />
                                            <Button size="sm" onClick={createCustomTag} className="h-8 px-2 bg-blue-600">OK</Button>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {templateData.customTags?.map(tag => (
                                            <div key={tag.key} className="flex items-center gap-2 group">
                                                <button
                                                    onClick={() => setSelectedTagKey(tag.key)}
                                                    className={`flex-1 text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all ${selectedTagKey === tag.key
                                                            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                                                            : 'bg-purple-50 text-purple-700 border-purple-100 hover:border-purple-300'
                                                        }`}
                                                >
                                                    {tag.label}
                                                </button>
                                                <button
                                                    onClick={() => deleteCustomTag(tag.key)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {(!templateData.customTags || templateData.customTags.length === 0) && (
                                            <p className="text-xs text-slate-400 italic text-center py-2">Aucun champ personnalisé</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800 mt-auto">
                                    <strong>Astuce :</strong> Sélectionnez une balise puis cliquez sur le document pour la placer.
                                </div>
                            </div>
                        </>
                    )}

                    {step === 'input_values' && (
                        <div className="w-full flex items-center justify-center p-12">
                            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Edit className="w-5 h-5 text-blue-500" />
                                    Saisie des valeurs
                                </h3>

                                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                                    {templateData.customTags?.length > 0 ? (
                                        templateData.customTags.map(tag => (
                                            <div key={tag.key}>
                                                <Label className="text-sm font-semibold text-slate-700 mb-1 block">
                                                    {tag.label}
                                                </Label>
                                                <Input
                                                    value={customTagValues[tag.key]}
                                                    onChange={e => setCustomTagValues(prev => ({ ...prev, [tag.key]: e.target.value }))}
                                                    placeholder={`Valeur pour ${tag.label}`}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-500 text-center py-4">Aucun champ personnalisé à remplir. Vous pouvez générer le document directement.</p>
                                    )}
                                </div>

                                <div className="flex gap-4 mt-8 pt-4 border-t">
                                    <Button variant="outline" onClick={() => setStep('editor')} className="flex-1">
                                        Retour
                                    </Button>
                                    <Button
                                        onClick={generatePDF}
                                        disabled={isGenerating}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {isGenerating ? 'Génération...' : 'Confirmer et Télécharger'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

// Helper component for Icon
function Edit({ className }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}
