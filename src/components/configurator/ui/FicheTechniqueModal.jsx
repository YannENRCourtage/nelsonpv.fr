import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
    Download, 
    RotateCcw, 
    Camera, 
    ZoomIn, 
    Scissors, 
    Eye, 
    Layers,
    Sparkles
} from 'lucide-react';
import { generateFicheTechniquePDF } from '@/services/FicheTechniquePDFService.js';

// Réglages par défaut optimisés et personnalisés
const DEFAULT_SETTINGS = {
    main3D: {
        cropTop: 7,
        cropBottom: 8,
        cropLeft: 7,
        cropRight: 8,
        zoom: 1.55,
        offsetX: 22,
        offsetY: -42,
    },
    pignon: {
        cropTop: 13,
        cropBottom: 12,
        cropLeft: 8,
        cropRight: 9,
        zoom: 1.05,
        offsetX: 0,
        offsetY: 0,
    },
    facadeSud: {
        cropTop: 4,
        cropBottom: 4,
        cropLeft: 0,
        cropRight: 0,
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
    },
};

/**
 * Recadre et transforme une image en DataURL haute résolution
 */
async function processCroppedImage(srcDataUrl, settings) {
    if (!srcDataUrl) return null;
    const { cropTop = 0, cropBottom = 0, cropLeft = 0, cropRight = 0, zoom = 1, offsetX = 0, offsetY = 0 } = settings || {};

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const origW = img.width;
            const origH = img.height;

            const cutL = (cropLeft / 100) * origW;
            const cutR = (cropRight / 100) * origW;
            const cutT = (cropTop / 100) * origH;
            const cutB = (cropBottom / 100) * origH;

            const targetW = Math.max(20, origW - cutL - cutR);
            const targetH = Math.max(20, origH - cutT - cutB);

            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');

            // Fond blanc pur pour fusion parfaite
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(zoom, zoom);
            ctx.translate(offsetX * (canvas.width / 400), offsetY * (canvas.height / 300));
            ctx.drawImage(
                img,
                cutL, cutT, targetW, targetH,
                -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height
            );
            ctx.restore();

            resolve(canvas.toDataURL('image/png', 1.0));
        };
        img.onerror = () => resolve(srcDataUrl);
        img.src = srcDataUrl;
    });
}

export function FicheTechniqueModal({
    isOpen,
    onClose,
    config,
    isAcama = false,
    initialImages = {},
    onRecaptureCurrent3D = null,
}) {
    const [activeTab, setActiveTab] = useState('main3D');
    const [images, setImages] = useState({
        main3D: initialImages.imgMain3D || null,
        pignon: initialImages.imgPignon || null,
        facadeSud: initialImages.imgFacadeSud || null,
    });
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRecapturing, setIsRecapturing] = useState(false);

    // Mettre à jour les images si de nouvelles sont fournies à l'ouverture
    useEffect(() => {
        if (isOpen) {
            setImages({
                main3D: initialImages.imgMain3D || null,
                pignon: initialImages.imgPignon || null,
                facadeSud: initialImages.imgFacadeSud || null,
            });
        }
    }, [isOpen, initialImages]);

    const updateSetting = (key, field, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value,
            }
        }));
    };

    const resetViewSettings = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: { ...DEFAULT_SETTINGS[key] }
        }));
    };

    const handleRecapture3D = async () => {
        if (!onRecaptureCurrent3D || isRecapturing) return;
        setIsRecapturing(true);
        try {
            const new3D = await onRecaptureCurrent3D();
            if (new3D) {
                setImages(prev => ({ ...prev, main3D: new3D }));
            }
        } catch (e) {
            console.error('Erreur recapture 3D:', e);
        } finally {
            setIsRecapturing(false);
        }
    };

    const handleGenerateAndDownload = async () => {
        setIsGenerating(true);
        try {
            // Traitement et recadrage des 3 images avec les réglages
            const [proc3D, procPignon, procFacade] = await Promise.all([
                processCroppedImage(images.main3D, settings.main3D),
                processCroppedImage(images.pignon, settings.pignon),
                processCroppedImage(images.facadeSud, settings.facadeSud),
            ]);

            await generateFicheTechniquePDF({
                config,
                isAcama,
                imgMain3D: proc3D,
                imgPignon: procPignon,
                imgFacadeSud: procFacade,
            });

            onClose();
        } catch (err) {
            console.error('Erreur export PDF Fiche Technique:', err);
            alert("Une erreur est survenue lors de l'export du PDF : " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const currentKey = activeTab === 'globalPreview' ? 'main3D' : activeTab;
    const currentSettings = settings[currentKey] || DEFAULT_SETTINGS.main3D;
    const currentImg = images[currentKey];

    const VIEW_LABELS = {
        main3D: '1. Vue 3D Perspective',
        pignon: '2. Vue Pignon (Gauche)',
        facadeSud: '3. Vue Façade Sud',
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isGenerating && !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-900 text-white border-slate-700 shadow-2xl rounded-2xl">
                
                {/* HEADER */}
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                                Recadrage & Aperçu de la Fiche Technique
                            </DialogTitle>
                            <p className="text-xs text-slate-400">
                                Ajustez le cadrage, le zoom et la position de chaque visuel avant de générer le PDF.
                            </p>
                        </div>
                    </div>
                </div>

                {/* TABS SELECTOR */}
                <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex gap-2 flex-wrap">
                        {['main3D', 'pignon', 'facadeSud'].map((tabKey) => (
                            <button
                                key={tabKey}
                                onClick={() => setActiveTab(tabKey)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                                    activeTab === tabKey
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                        : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>{VIEW_LABELS[tabKey]}</span>
                            </button>
                        ))}
                        <button
                            onClick={() => setActiveTab('globalPreview')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                                activeTab === 'globalPreview'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Aperçu global PDF</span>
                        </button>
                    </div>

                    {activeTab === 'main3D' && onRecaptureCurrent3D && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRecapture3D}
                            disabled={isRecapturing}
                            className="bg-slate-800 hover:bg-slate-700 text-xs border-slate-700 text-slate-200 h-8 gap-1.5"
                            title="Prendre l'angle de vue 3D actuel affiché à l'écran"
                        >
                            <Camera className="w-3.5 h-3.5 text-blue-400" />
                            <span>{isRecapturing ? 'Recapture...' : 'Recapturer vue 3D actuelle'}</span>
                        </Button>
                    )}
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab !== 'globalPreview' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            
                            {/* PREVIEW CONTAINER (LEFT) */}
                            <div className="lg:col-span-7 flex flex-col gap-3">
                                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                                    <span>Aperçu de la vue (Rendu fond blanc pur)</span>
                                </div>

                                {/* White Canvas Container */}
                                <div 
                                    className="relative w-full rounded-xl bg-white flex items-center justify-center overflow-hidden border border-slate-300 shadow-inner"
                                    style={{ height: '340px' }}
                                >
                                    {currentImg ? (
                                        <div className="relative w-full h-full flex items-center justify-center p-3">
                                            {/* Scaled & Offset Image */}
                                            <div 
                                                className="w-full h-full flex items-center justify-center overflow-hidden"
                                                style={{
                                                    clipPath: `inset(${currentSettings.cropTop}% ${currentSettings.cropRight}% ${currentSettings.cropBottom}% ${currentSettings.cropLeft}%)`,
                                                    transition: 'clip-path 0.1s ease',
                                                }}
                                            >
                                                <img
                                                    src={currentImg}
                                                    alt="Preview"
                                                    className="max-w-full max-h-full object-contain pointer-events-none select-none transition-transform duration-75"
                                                    style={{
                                                        transform: `scale(${currentSettings.zoom}) translate(${currentSettings.offsetX}px, ${currentSettings.offsetY}px)`,
                                                    }}
                                                />
                                            </div>

                                            {/* Crop guide overlays (dashed rectangle when cropping) */}
                                            {(currentSettings.cropTop > 0 || currentSettings.cropBottom > 0 || currentSettings.cropLeft > 0 || currentSettings.cropRight > 0) && (
                                                <div 
                                                    className="absolute border-2 border-dashed border-blue-500/50 pointer-events-none rounded-sm"
                                                    style={{
                                                        top: `${currentSettings.cropTop + 3}%`,
                                                        bottom: `${currentSettings.cropBottom + 3}%`,
                                                        left: `${currentSettings.cropLeft + 3}%`,
                                                        right: `${currentSettings.cropRight + 3}%`,
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 text-sm flex flex-col items-center gap-2">
                                            <Layers className="w-8 h-8 opacity-40 animate-pulse" />
                                            <span>Capture en attente...</span>
                                        </div>
                                    )}
                                </div>

                                <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                                    💡 <strong className="text-slate-200">Rendu sans bordure :</strong> L'image apparaîtra sur fond blanc parfaitement transparent et confondu avec le document PDF (style épuré).
                                </div>
                            </div>

                            {/* CONTROLS (RIGHT) */}
                            <div className="lg:col-span-5 space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                                
                                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                                        <Scissors className="w-3.5 h-3.5 text-blue-400" />
                                        <span>Réglages de cadrage</span>
                                    </h4>
                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        onClick={() => resetViewSettings(currentKey)}
                                        className="text-xs text-slate-400 hover:text-white h-7 gap-1 px-2"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Réinitialiser</span>
                                    </Button>
                                </div>

                                {/* Zoom / Échelle */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-300 font-medium flex items-center gap-1">
                                            <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
                                            Zoom / Échelle
                                        </span>
                                        <span className="font-mono text-blue-400 font-bold">{Math.round(currentSettings.zoom * 100)}%</span>
                                    </div>
                                    <Slider
                                        value={[currentSettings.zoom]}
                                        min={0.8}
                                        max={2.0}
                                        step={0.05}
                                        onValueChange={([val]) => updateSetting(currentKey, 'zoom', val)}
                                        className="py-1"
                                    />
                                </div>

                                {/* Déplacements Pan (X / Y) */}
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400 text-[11px]">Déplacement X</span>
                                            <span className="font-mono text-slate-300 text-[11px]">{currentSettings.offsetX}px</span>
                                        </div>
                                        <Slider
                                            value={[currentSettings.offsetX]}
                                            min={-80}
                                            max={80}
                                            step={2}
                                            onValueChange={([val]) => updateSetting(currentKey, 'offsetX', val)}
                                            className="py-1"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400 text-[11px]">Déplacement Y</span>
                                            <span className="font-mono text-slate-300 text-[11px]">{currentSettings.offsetY}px</span>
                                        </div>
                                        <Slider
                                            value={[currentSettings.offsetY]}
                                            min={-80}
                                            max={80}
                                            step={2}
                                            onValueChange={([val]) => updateSetting(currentKey, 'offsetY', val)}
                                            className="py-1"
                                        />
                                    </div>
                                </div>

                                {/* Rognage des bordures (Haut/Bas/Gauche/Droite) */}
                                <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                                        Rognage des bordures (Crop %)
                                    </span>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-slate-400">Haut</span>
                                                <span className="font-mono text-slate-300">{currentSettings.cropTop}%</span>
                                            </div>
                                            <Slider
                                                value={[currentSettings.cropTop]}
                                                min={0}
                                                max={35}
                                                step={1}
                                                onValueChange={([val]) => updateSetting(currentKey, 'cropTop', val)}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-slate-400">Bas</span>
                                                <span className="font-mono text-slate-300">{currentSettings.cropBottom}%</span>
                                            </div>
                                            <Slider
                                                value={[currentSettings.cropBottom]}
                                                min={0}
                                                max={35}
                                                step={1}
                                                onValueChange={([val]) => updateSetting(currentKey, 'cropBottom', val)}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-slate-400">Gauche</span>
                                                <span className="font-mono text-slate-300">{currentSettings.cropLeft}%</span>
                                            </div>
                                            <Slider
                                                value={[currentSettings.cropLeft]}
                                                min={0}
                                                max={35}
                                                step={1}
                                                onValueChange={([val]) => updateSetting(currentKey, 'cropLeft', val)}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-slate-400">Droite</span>
                                                <span className="font-mono text-slate-300">{currentSettings.cropRight}%</span>
                                            </div>
                                            <Slider
                                                value={[currentSettings.cropRight]}
                                                min={0}
                                                max={35}
                                                step={1}
                                                onValueChange={([val]) => updateSetting(currentKey, 'cropRight', val)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* APERÇU GLOBAL DU PDF (FIDÈLE À LA MISE EN PAGE RÉELLE) */
                        <div className="flex flex-col items-center">
                            <div className="w-full max-w-xl bg-white text-slate-900 rounded-xl p-6 shadow-2xl border border-slate-200">
                                
                                {/* Header simulé avec espacement ajouté */}
                                <div className="text-center pt-2 pb-4">
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Plan de structure</h2>
                                    <p className="text-xs font-bold text-blue-700 mt-0.5">
                                        {Number(config.length || 30).toFixed(2)}m × {Number(config.width || 25.5).toFixed(2)}m - {Math.round((config.length || 30) * (config.width || 25.5))} m²
                                        {config.hasSolar && ` - ${Number(config.solarStats?.power || 148.8).toFixed(1)} kWc`}
                                    </p>
                                </div>

                                {/* Disposition exacte des 3 visuels sur fond blanc */}
                                <div className="space-y-4">
                                    {/* 1. Vue 3D Principale (Haut, Pleine largeur, cadre agrandi) */}
                                    <div className="flex justify-center items-center w-full h-[200px]">
                                        {images.main3D ? (
                                            <div 
                                                className="w-full h-full flex items-center justify-center overflow-hidden"
                                                style={{
                                                    clipPath: `inset(${settings.main3D.cropTop}% ${settings.main3D.cropRight}% ${settings.main3D.cropBottom}% ${settings.main3D.cropLeft}%)`,
                                                }}
                                            >
                                                <img 
                                                    src={images.main3D} 
                                                    alt="Vue 3D Principale" 
                                                    className="max-h-full max-w-full object-contain"
                                                    style={{ transform: `scale(${settings.main3D.zoom}) translate(${settings.main3D.offsetX}px, ${settings.main3D.offsetY}px)` }}
                                                />
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* 2. Vue Pignon (Milieu, Cadre élargi à gauche) */}
                                    <div className="flex items-center w-full h-[135px]">
                                        <div className="w-[70%] h-full flex items-center justify-start">
                                            {images.pignon ? (
                                                <div 
                                                    className="w-full h-full flex items-center justify-center overflow-hidden"
                                                    style={{
                                                        clipPath: `inset(${settings.pignon.cropTop}% ${settings.pignon.cropRight}% ${settings.pignon.cropBottom}% ${settings.pignon.cropLeft}%)`,
                                                    }}
                                                >
                                                    <img 
                                                        src={images.pignon} 
                                                        alt="Vue Pignon" 
                                                        className="max-h-full max-w-full object-contain"
                                                        style={{ transform: `scale(${settings.pignon.zoom}) translate(${settings.pignon.offsetX}px, ${settings.pignon.offsetY}px)` }}
                                                    />
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    {/* 3. Vue Façade Sud (Bas, Pleine largeur, emplacement d'origine) */}
                                    <div className="flex justify-center items-center w-full h-[160px]">
                                        {images.facadeSud ? (
                                            <div 
                                                className="w-full h-full flex items-center justify-center overflow-hidden"
                                                style={{
                                                    clipPath: `inset(${settings.facadeSud.cropTop}% ${settings.facadeSud.cropRight}% ${settings.facadeSud.cropBottom}% ${settings.facadeSud.cropLeft}%)`,
                                                }}
                                            >
                                                <img 
                                                    src={images.facadeSud} 
                                                    alt="Façade Sud" 
                                                    className="max-h-full max-w-full object-contain"
                                                    style={{ transform: `scale(${settings.facadeSud.zoom}) translate(${settings.facadeSud.offsetX}px, ${settings.facadeSud.offsetY}px)` }}
                                                />
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Bloc À votre charge simulé */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px] text-slate-700">
                                        <p className="font-bold text-slate-900 mb-0.5">À votre charge :</p>
                                        <p>• Terrassement / empièrement (si nécessaire)</p>
                                        <p>• Tranchée du bâtiment jusqu'au point de livraison (compteur)</p>
                                        <p>• Équipements optionnels : chéneaux / bardage / évacuation des eaux pluviales / portails / autres..</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isGenerating}
                        className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white"
                    >
                        Annuler
                    </Button>

                    <Button
                        onClick={handleGenerateAndDownload}
                        disabled={isGenerating}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 shadow-lg shadow-blue-500/25 flex items-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Génération du PDF...</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                <span>Télécharger la Fiche Technique PDF</span>
                            </>
                        )}
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    );
}

export default FicheTechniqueModal;
