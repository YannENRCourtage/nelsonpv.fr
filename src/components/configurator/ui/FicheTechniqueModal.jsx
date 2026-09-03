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
import { findBarconniereBuilding } from '@/data/barconniereCatalog.js';
import { BATITECH_MODELS } from '@/data/sechoirBatitechModels.js';

// Réglages par défaut optimisés et personnalisés
const DEFAULT_SETTINGS = {
    main3D: {
        cropTop: 0,
        cropBottom: 0,
        cropLeft: 0,
        cropRight: 0,
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        dimensionFontSize: 1.2,
    },
    pignon: {
        cropTop: 0,
        cropBottom: 0,
        cropLeft: 0,
        cropRight: 0,
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        dimensionFontSize: 1.2,
    },
    facadeSud: {
        cropTop: 0,
        cropBottom: 0,
        cropLeft: 0,
        cropRight: 0,
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        dimensionFontSize: 1.2,
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
    onRecaptureViewWithFontSize = null,
}) {
    const [activeTab, setActiveTab] = useState('main3D');
    const [images, setImages] = useState({
        main3D: initialImages.imgMain3D || null,
        pignon: initialImages.imgPignon || null,
        facadeSud: initialImages.imgFacadeSud || null,
    });
    const isBt3115 = config?.configMode === 'batitech' && (config?.selectedBatitechModel === 'BT-3.1.15' || config?.selectedBatitechModel === '3.1.15');

    const defaultSettings = React.useMemo(() => ({
        main3D: { ...DEFAULT_SETTINGS.main3D },
        pignon: { ...DEFAULT_SETTINGS.pignon },
        facadeSud: {
            ...DEFAULT_SETTINGS.facadeSud,
            dimensionFontSize: isBt3115 ? 0.8 : 1.2,
        },
    }), [isBt3115]);

    const [settings, setSettings] = useState(defaultSettings);
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
            setSettings(defaultSettings);
        }
    }, [isOpen, initialImages, defaultSettings]);

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
            [key]: { ...defaultSettings[key] }
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
            <DialogContent className="max-w-7xl w-[96vw] max-h-[96vh] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-900 text-white border-slate-700 shadow-2xl rounded-2xl">
                
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

                                {/* White Canvas Container (+20% hauteur et largeur) */}
                                <div 
                                    className="relative w-full rounded-xl bg-white flex items-center justify-center overflow-hidden border border-slate-300 shadow-inner"
                                    style={{ height: '510px' }}
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
                                        min={0.5}
                                        max={5.0}
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
                                            min={-160}
                                            max={160}
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
                                            min={-160}
                                            max={160}
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

                                {/* Taille de la police des cotes (Mesures) pour cette vue */}
                                <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                            Taille des cotes &amp; mesures
                                        </span>
                                        <span className="font-mono text-amber-300 font-black text-xs bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                                            {(currentSettings.dimensionFontSize !== undefined ? currentSettings.dimensionFontSize : 1.2).toFixed(1)}
                                        </span>
                                    </div>
                                    <Slider
                                        value={[currentSettings.dimensionFontSize !== undefined ? currentSettings.dimensionFontSize : 1.2]}
                                        min={0.3}
                                        max={2.5}
                                        step={0.1}
                                        onValueChange={([val]) => {
                                            updateSetting(currentKey, 'dimensionFontSize', val);
                                        }}
                                        onValueCommit={async ([val]) => {
                                            if (onRecaptureViewWithFontSize) {
                                                setIsRecapturing(true);
                                                try {
                                                    const newImg = await onRecaptureViewWithFontSize(currentKey, val);
                                                    if (newImg) {
                                                        setImages(prev => ({ ...prev, [currentKey]: newImg }));
                                                    }
                                                } catch (e) {
                                                    console.error('Erreur recapture dimension font size:', e);
                                                } finally {
                                                    setIsRecapturing(false);
                                                }
                                            }
                                        }}
                                        className="py-1"
                                    />
                                    {/* Presets rapides */}
                                    <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                                        {[
                                            { label: 'Fin (0.5)', val: 0.5 },
                                            { label: 'Standard (0.8)', val: 0.8 },
                                            { label: 'Grand (1.2)', val: 1.2 },
                                            { label: 'Max (1.8)', val: 1.8 }
                                        ].map(preset => (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={async () => {
                                                    updateSetting(currentKey, 'dimensionFontSize', preset.val);
                                                    if (onRecaptureViewWithFontSize) {
                                                        setIsRecapturing(true);
                                                        try {
                                                            const newImg = await onRecaptureViewWithFontSize(currentKey, preset.val);
                                                            if (newImg) {
                                                                setImages(prev => ({ ...prev, [currentKey]: newImg }));
                                                            }
                                                        } catch (e) {
                                                            console.error('Erreur recapture preset font size:', e);
                                                        } finally {
                                                            setIsRecapturing(false);
                                                        }
                                                    }
                                                }}
                                                className={`py-1 px-1 rounded text-[10px] font-bold border transition-all text-center ${
                                                    Math.abs((currentSettings.dimensionFontSize !== undefined ? currentSettings.dimensionFontSize : 1.2) - preset.val) < 0.05
                                                        ? 'bg-amber-500/30 text-amber-300 border-amber-500/60 shadow-xs'
                                                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* APERÇU GLOBAL DU PDF (FIDÈLE À LA MISE EN PAGE DU PDF RÉEL) */
                        (() => {
                            const length = Number(config?.length || 30.0);
                            const mainWidth = Number(config?.width || 15.0);
                            const leftExt = config?.leftSide !== 'none' ? Number(config?.leftWidth || 0) : 0;
                            const rightExt = config?.rightSide !== 'none' ? Number(config?.rightWidth || 0) : 0;
                            const totalWidth = mainWidth + leftExt + rightExt;
                            const floorArea = Math.round(length * totalWidth);

                            const isBatitech = config?.configMode === 'batitech';
                            const batitechModel = isBatitech ? (BATITECH_MODELS[config?.selectedBatitechModel] || BATITECH_MODELS['BT-3.1.15']) : null;
                            const isCustom = !isBatitech && (
                                config?.configMode === 'custom' || 
                                (!isAcama && config?.buildingType === 'custom') ||
                                Boolean(config?.isCustom) ||
                                Boolean(config?.isSurMesure) ||
                                (config?.gamme && String(config?.gamme).toLowerCase().includes('sur-mesure')) ||
                                (config?.model && String(config?.model).toLowerCase().includes('sur-mesure')) ||
                                (config?.selectedModel && String(config?.selectedModel).toLowerCase().includes('sur-mesure')) ||
                                (config?.name && String(config?.name).toLowerCase().includes('sur-mesure'))
                            );

                            const barcMatch = isBatitech ? {} : findBarconniereBuilding({
                                length,
                                width: mainWidth,
                                buildingType: config?.buildingType || 'symetrique',
                                leftSide: config?.leftSide || 'none',
                                rightSide: config?.rightSide || 'none',
                                leftWidth: config?.leftWidth || 0,
                                rightWidth: config?.rightWidth || 0,
                                isAcama,
                            });

                            const gammeName = isBatitech ? 'Séchoir BatiTech®' : (isCustom ? 'Bâtiment Sur-Mesure' : (barcMatch.gamme || 'Gamme'));
                            const buildingCode = isBatitech ? batitechModel?.name : String(barcMatch.id || '').replace(/^#/, '').trim();
                            const equivalenceCode = isBatitech ? 'AS9.2' : String(barcMatch.code || '').trim();

                            const TYPE_LABELS = {
                                symetrique: 'Bipente Symétrique',
                                asymetrique_1: 'Asymétrique 1 zone',
                                asymetrique_2: 'Asymétrique 2 zones',
                                monopente: 'Monopente',
                                ombriere_pl: 'Ombrière Poids Lourds (PL)',
                                ombriere_vl_double: 'Ombrière VL Double',
                                ombriere_vl_simple_droite: 'Ombrière VL Simple (Droite)',
                                ombriere_vl_simple_gauche: 'Ombrière VL Simple (Gauche)',
                                custom: 'Bâtiment Sur-Mesure',
                            };
                            const typologyLabel = isBatitech ? 'Asymétrique 1 zone' : (TYPE_LABELS[config?.buildingType] || config?.buildingType || 'Structure Métallique');

                            // Puissance solaire : Priorité à la colonne Puissance du catalogue officiel (Tableaux bâtiments complet.xlsx)
                            const installedKwc = isBatitech
                                ? (batitechModel?.puissanceKwc || 30.15)
                                : (isCustom
                                    ? (Number(config?.solarStats?.power) || Math.round(floorArea * 0.20))
                                    : (barcMatch.kwc || Number(config?.solarStats?.power) || Math.round(floorArea * 0.20)));
                            const panelCount = isBatitech
                                ? (batitechModel?.nbModules || 90)
                                : (Number(config?.solarStats?.count) || Math.round((installedKwc * 1000) / (isAcama ? 460 : 465)));
                            const estimatedProductionKwh = Math.round(installedKwc * 1150);

                            const totalBuildingCost = isBatitech
                                ? (batitechModel?.postesInvestissement?.structureMetallique || 217822)
                                : (isCustom ? Math.round(floorArea * 128) : (barcMatch.tarif || 0));

                            const cogenAirCost = isBatitech
                                ? (batitechModel?.postesInvestissement?.systemeCogenAir || 77386)
                                : 0;

                            const pvCostPerWc = 0.55;
                            const pvInstallationCost = isBatitech
                                ? (batitechModel?.postesInvestissement?.centraleSolaire || 31845)
                                : Math.round(installedKwc * 1000 * pvCostPerWc + 15000);

                            const totalProjectCost = isBatitech
                                ? (totalBuildingCost + cogenAirCost + (config?.hasSolar ? pvInstallationCost : 0))
                                : (totalBuildingCost + (config?.hasSolar ? pvInstallationCost : 0));

                            const ratioCostPerM2 = floorArea > 0 ? Math.round(totalBuildingCost / floorArea) : (barcMatch.ratioM2 || 116);
                            const ratioTotalCostPerWc = installedKwc > 0 ? (totalProjectCost / (installedKwc * 1000)).toFixed(2) : '0.00';
                            const ratioStructureCostPerWc = installedKwc > 0 ? (totalBuildingCost / (installedKwc * 1000)).toFixed(2) : (barcMatch.ratioKwc?.toFixed(2) || '0.00');

                            const pitchDeg = isBatitech ? 15 : Number(config?.roofPitch || 10);
                            const roundedPitchDeg = Number.isInteger(pitchDeg) ? pitchDeg : Number(pitchDeg.toFixed(2));
                            const pitchPct = Math.round(Math.tan(pitchDeg * (Math.PI / 180)) * 100);
                            const pitchLabel = `${roundedPitchDeg}° (${pitchPct}%)`;

                            const bType = (config?.buildingType || '').toLowerCase();
                            const gName = (config?.gamme || '').toLowerCase();
                            const isOmbriere = bType.includes('ombriere') || gName.includes('ombriere') || bType.startsWith('o_') || bType.startsWith('omb_');
                            const isAsym1 = !isOmbriere && (bType.includes('asymetrique_1') || (bType.includes('asym') && !bType.includes('2')));
                            const isAsym2 = !isOmbriere && (bType.includes('asymetrique_2') || (bType.includes('asym') && bType.includes('2')));
                            const isMonopente = !isOmbriere && (bType.includes('monopente') || bType.includes('mono') || gName.includes('atlas'));

                            let photoUrl = '/hangar_symetrique.jpg';
                            if (isBatitech) {
                                photoUrl = '/Séchoir 6 travées bardage métal.jpg';
                            } else if (isAsym1) {
                                photoUrl = '/hangar_asymetrique_1_zone.jpg';
                            } else if (isAsym2) {
                                photoUrl = '/hangar_asymetrique_2_zones.jpg';
                            } else if (isMonopente) {
                                photoUrl = '/hangar_monopente.jpg';
                            } else if (isOmbriere) {
                                if (totalWidth >= 18 || bType.includes('20') || bType.includes('25')) photoUrl = '/ombriere_pl_large.jpg';
                                else if (bType.includes('ombriere_pl') || totalWidth >= 14) photoUrl = '/ombriere_pl.jpg';
                                else if (bType.includes('plus') || totalWidth >= 10.5) photoUrl = '/ombriere_vl_double_plus.jpg';
                                else if (bType.includes('double')) photoUrl = '/ombriere_vl_double.jpg';
                                else if (bType.includes('droite')) photoUrl = '/ombriere_vl_simple_droite.jpg';
                                else photoUrl = '/ombriere_vl_simple_gauche.jpg';
                            }

                            let batitechInterieurUrl = null;
                            if (isBatitech) {
                                const modelId = config?.selectedBatitechModel || 'BT-3.1.15';
                                if (modelId === 'BT-6.2.15' || modelId.includes('6.2')) {
                                    batitechInterieurUrl = '/BatiTech 6.2.15.jpg';
                                } else if (modelId === 'BT-8.3.15' || modelId.includes('8.3')) {
                                    batitechInterieurUrl = '/BatiTech 8.3.15.jpg';
                                } else {
                                    batitechInterieurUrl = '/BatiTech 3.1.15.jpg';
                                }
                            }

                            return (
                                <div className="flex flex-col items-center py-2">
                                    <div className="w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col p-5 sm:p-7 relative select-none">
                                        
                                        {/* 1. HEADER BANNER */}
                                        <div className="flex items-center justify-between pb-3 border-b-2 border-blue-600">
                                            <div className="flex items-center gap-3">
                                                <img src="/logo-header.png" alt="ENR Courtage" className="h-9 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                                                <div className="flex flex-col">
                                                    <span className="font-extrabold text-blue-950 text-sm tracking-tight">ENR COURTAGE</span>
                                                    <span className="text-[9px] text-slate-500 font-medium">Bureaux d'études &amp; Développement photovoltaïque</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <h2 className="text-lg sm:text-xl font-black text-blue-900 tracking-tight uppercase leading-tight">FICHE TECHNIQUE</h2>
                                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">NELSON • CONFIGURATEUR DE STRUCTURES PHOTOVOLTAÏQUES</p>
                                            </div>
                                        </div>

                                        {/* 2. BODY : SIDEBAR GAUCHE + ZONE IMAGES DROITE */}
                                        <div className="flex gap-4 sm:gap-6 mt-4 items-stretch">
                                            
                                            {/* SIDEBAR GAUCHE (Fond sombre #0f172a) */}
                                            <div className="w-[33%] bg-[#0f172a] text-slate-200 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between text-[8px] sm:text-[9.5px] space-y-2.5 shadow-md">
                                                
                                                {/* 1. Identification */}
                                                <div className="space-y-0.5">
                                                    <h4 className="font-bold text-sky-400 uppercase text-[9px] sm:text-[10.5px] border-b border-slate-700 pb-0.5">1. Identification</h4>
                                                    <div className="flex justify-between text-slate-400"><span>Gamme :</span><strong className="text-white font-bold">{gammeName}</strong></div>
                                                    {buildingCode && <div className="flex justify-between text-slate-400"><span>Modèle :</span><strong className="text-amber-400 font-bold">{buildingCode}</strong></div>}
                                                    {equivalenceCode && <div className="flex justify-end"><span className="text-slate-300 font-mono text-[8px]">{equivalenceCode}</span></div>}
                                                </div>

                                                {/* 2. Structure & Dimensions */}
                                                <div className="space-y-0.5">
                                                    <h4 className="font-bold text-sky-400 uppercase text-[9px] sm:text-[10.5px] border-b border-slate-700 pb-0.5">2. Structure &amp; Dimensions</h4>
                                                    <div className="flex justify-between text-slate-400"><span>Typologie :</span><span className="text-slate-200 truncate max-w-[110px]">{typologyLabel}</span></div>
                                                    <div className="flex justify-between text-slate-400"><span>Longueur :</span><span className="text-slate-200">{length.toFixed(2)} m</span></div>
                                                    <div className="flex justify-between text-slate-400"><span>Largeur totale :</span><span className="text-slate-200">{totalWidth.toFixed(2)} m</span></div>
                                                    <div className="flex justify-between text-slate-400"><span>Surface au sol :</span><strong className="text-sky-400 font-bold">{floorArea} m²</strong></div>
                                                    <div className="flex justify-between text-slate-400"><span>Travées :</span><span className="text-slate-200">{isBatitech ? `${batitechModel?.zones === 1 ? 3 : (batitechModel?.zones === 2 ? 6 : 8)} × 6.00 m` : (barcMatch.travees || `${config.bayCount || 4} × ${config.baySpacing || 7.5} m`)}</span></div>
                                                    <div className="flex justify-between text-slate-400"><span>Avants-toit :</span><span className="text-slate-200">environ 50 cm</span></div>
                                                    <div className="flex justify-between text-slate-400"><span>Niveau fondations :</span><span className="text-slate-200">+/- 0.0 m</span></div>
                                                </div>

                                                {/* 3. Hauteurs & Toiture */}
                                                <div className="space-y-0.5">
                                                    <h4 className="font-bold text-sky-400 uppercase text-[9px] sm:text-[10.5px] border-b border-slate-700 pb-0.5">3. Hauteurs &amp; Toiture</h4>
                                                    <div className="flex justify-between text-slate-400"><span>Hauteur Sablière :</span><span className="text-slate-200">{isBatitech ? '4.00 m' : `${Number(config.eaveHeight || 4).toFixed(2)}m`}</span></div>
                                                    <div className="flex justify-between text-slate-400"><span>Hauteur Faîtage :</span><span className="text-slate-200">{isBatitech ? '8.40 m' : `${Number(config.ridgeHeight || 7.4).toFixed(2)}m`}</span></div>
                                                    <div className="flex justify-between text-slate-400"><span>Pente de toit :</span><span className="text-slate-200">{pitchLabel}</span></div>
                                                    <div className="flex justify-between text-slate-400"><span>Couverture :</span><span className="text-slate-200">Bac acier (RAL 7016)</span></div>
                                                    <div className="flex justify-between text-slate-400"><span>Anti-condensation :</span><span className="text-slate-200">Feutre régulateur</span></div>
                                                </div>

                                                {/* 4. Énergie Solaire */}
                                                <div className="space-y-0.5">
                                                    <h4 className="font-bold text-amber-400 uppercase text-[9px] sm:text-[10.5px] border-b border-slate-700 pb-0.5">4. Énergie Solaire</h4>
                                                    {(config.hasSolar || isBatitech) ? (
                                                        <>
                                                            <div className="flex justify-between text-slate-400"><span>Statut PV :</span><strong className="text-amber-400 font-bold">Activée</strong></div>
                                                            <div className="flex justify-between text-slate-400"><span>Puissance :</span><strong className="text-amber-400 font-bold">{installedKwc.toFixed(2)} kWc</strong></div>
                                                            <div className="flex justify-between text-slate-400"><span>Nombre modules :</span><span className="text-slate-200">{panelCount} panneaux</span></div>
                                                            <div className="flex justify-between text-slate-400"><span>Technologie :</span><span className="text-slate-200">{isBatitech ? "Cogen'Air® Thermovolt." : `${isAcama ? 460 : 465} Wc`}</span></div>
                                                            <div className="flex justify-between text-slate-400"><span>Prod. estimée :</span><span className="text-slate-200">~{estimatedProductionKwh.toLocaleString('fr-FR')} kWh/an</span></div>
                                                        </>
                                                    ) : (
                                                        <div className="flex justify-between text-slate-400"><span>Option solaire :</span><span className="text-slate-400">Non incluse</span></div>
                                                    )}
                                                </div>

                                                {/* 5. Chiffrage & Ratios */}
                                                {!isCustom && (
                                                    <div className="space-y-0.5">
                                                        <h4 className="font-bold text-emerald-400 uppercase text-[9px] sm:text-[10.5px] border-b border-slate-700 pb-0.5">5. Chiffrage &amp; Ratios</h4>
                                                        <div className="flex justify-between text-slate-400"><span>Structure métal. :</span><strong className="text-white font-bold">{totalBuildingCost.toLocaleString('fr-FR')} € HT</strong></div>
                                                        {isBatitech && <div className="flex justify-between text-slate-400"><span>Système Cogen'Air :</span><strong className="text-amber-400 font-bold">{cogenAirCost.toLocaleString('fr-FR')} € HT</strong></div>}
                                                        {(config.hasSolar || isBatitech) && <div className="flex justify-between text-slate-400"><span>Centrale {isBatitech ? 'Solaire' : 'PV'} :</span><span className="text-slate-200">{pvInstallationCost.toLocaleString('fr-FR')} € HT</span></div>}
                                                        <div className="flex justify-between text-slate-400"><span>Total Projet :</span><strong className="text-emerald-400 font-bold">{totalProjectCost.toLocaleString('fr-FR')} € HT</strong></div>
                                                        <div className="flex justify-between text-slate-400 pt-0.5 border-t border-slate-800"><span>Ratio / Surface :</span><strong className="text-sky-400 font-bold">{ratioCostPerM2} € / m²</strong></div>
                                                        {(config.hasSolar || isBatitech) && installedKwc > 0 && (
                                                            <>
                                                                <div className="flex justify-between text-slate-400"><span>Ratio Total / Wc :</span><span className="text-slate-200">{ratioTotalCostPerWc} € / Wc</span></div>
                                                                <div className="flex justify-between text-slate-400"><span>Ratio Struct. / Wc :</span><span className="text-slate-200">{ratioStructureCostPerWc} € / Wc</span></div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {/* 6. Options (UNIQUEMENT POUR BATITECH) */}
                                                {isBatitech && batitechModel?.options && (
                                                    <div className="space-y-0.5">
                                                        <h4 className="font-bold text-pink-400 uppercase text-[9px] sm:text-[10.5px] border-b border-slate-700 pb-0.5">6. Options</h4>
                                                        <div className="flex justify-between text-slate-400"><span>Auvent Sud (4m) :</span><strong className="text-white font-bold">{batitechModel.options.auventSud.toLocaleString('fr-FR')} € HT</strong></div>
                                                        <div className="flex justify-between text-slate-400"><span>Auvent Nord (4m) :</span><strong className="text-white font-bold">{batitechModel.options.auventNord.toLocaleString('fr-FR')} € HT</strong></div>
                                                        <div className="flex justify-between text-slate-400"><span>Auvents N + S :</span><strong className="text-amber-400 font-bold">{batitechModel.options.auventNordSud.toLocaleString('fr-FR')} € HT</strong></div>
                                                        <div className="flex justify-between text-slate-400"><span>Travée suppl. 6m :</span><strong className="text-sky-400 font-bold">{batitechModel.options.traveeSupplementaire.toLocaleString('fr-FR')} € HT</strong></div>
                                                    </div>
                                                )}

                                                {/* Logo Nelson centré en bas */}
                                                <div className="pt-2 flex justify-center">
                                                    <img src="/logo-nelson.png" alt="Nelson" className="h-6 object-contain opacity-90" />
                                                </div>
                                            </div>

                                            {/* ZONE DROITE : VISUELS + CADRE À VOTRE CHARGE + PHOTO */}
                                            <div className="w-[67%] flex flex-col justify-between space-y-3">
                                                
                                                {/* Titre "Plan de structure" */}
                                                <div className="text-center pt-1 pb-1">
                                                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Plan de structure</h3>
                                                    <p className="text-[10px] sm:text-xs font-bold text-blue-900 mt-0.5">
                                                        {length.toFixed(2)}m × {totalWidth.toFixed(2)}m - {floorArea} m²{(config.hasSolar || isBatitech) ? ` - ${installedKwc.toFixed(1)} kWc` : ''}
                                                    </p>
                                                </div>

                                                {/* 1. Vue 3D Principale */}
                                                <div className="flex justify-center items-center w-full h-[150px] sm:h-[190px] overflow-hidden">
                                                    {images.main3D ? (
                                                        <div 
                                                            className="w-full h-full flex items-center justify-center overflow-hidden"
                                                            style={{ clipPath: `inset(${settings.main3D.cropTop}% ${settings.main3D.cropRight}% ${settings.main3D.cropBottom}% ${settings.main3D.cropLeft}%)` }}
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

                                                {/* 2. Vue Pignon + Vue Intérieure (si BatiTech) ou Cadre À votre charge (si standard) */}
                                                {isBatitech ? (
                                                    /* BatiTech : Vue Pignon à gauche (50%) + Vue Intérieure à droite (50%) */
                                                    <div className="flex items-stretch justify-between gap-2.5 w-full min-h-[110px]">
                                                        <div className="w-[50%] flex items-center justify-start overflow-hidden">
                                                            {images.pignon ? (
                                                                <div 
                                                                    className="w-full h-full flex items-center justify-start overflow-hidden"
                                                                    style={{ clipPath: `inset(${settings.pignon.cropTop}% ${settings.pignon.cropRight}% ${settings.pignon.cropBottom}% ${settings.pignon.cropLeft}%)` }}
                                                                >
                                                                    <img 
                                                                        src={images.pignon} 
                                                                        alt="Vue Pignon" 
                                                                        className="max-h-full max-w-full object-contain object-left"
                                                                        style={{ transform: `scale(${settings.pignon.zoom}) translate(${settings.pignon.offsetX}px, ${settings.pignon.offsetY}px)` }}
                                                                    />
                                                                </div>
                                                            ) : null}
                                                        </div>

                                                        {/* Vue Intérieure BatiTech */}
                                                        <div className="w-[50%] flex items-center justify-center overflow-hidden">
                                                            {batitechInterieurUrl && (
                                                                <img 
                                                                    src={batitechInterieurUrl} 
                                                                    alt="Vue Intérieure Séchoir BatiTech" 
                                                                    className="max-h-full max-w-full object-contain"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Standard : Vue Pignon à gauche (58%) + Cadre À votre charge à droite (40%) */
                                                    <div className="flex items-stretch justify-between gap-2.5 w-full min-h-[110px]">
                                                        <div className="w-[58%] flex items-center justify-start overflow-hidden">
                                                            {images.pignon ? (
                                                                <div 
                                                                    className="w-full h-full flex items-center justify-start overflow-hidden"
                                                                    style={{ clipPath: `inset(${settings.pignon.cropTop}% ${settings.pignon.cropRight}% ${settings.pignon.cropBottom}% ${settings.pignon.cropLeft}%)` }}
                                                                >
                                                                    <img 
                                                                        src={images.pignon} 
                                                                        alt="Vue Pignon" 
                                                                        className="max-h-full max-w-full object-contain object-left"
                                                                        style={{ transform: `scale(${settings.pignon.zoom}) translate(${settings.pignon.offsetX}px, ${settings.pignon.offsetY}px)` }}
                                                                    />
                                                                </div>
                                                            ) : null}
                                                        </div>

                                                        {/* Cadre À votre charge */}
                                                        <div className="w-[40%] self-start bg-blue-50/80 border border-blue-200 rounded-lg p-2 text-[7.5px] sm:text-[9px] text-slate-700 flex flex-col justify-start space-y-0.5 shadow-xs">
                                                            <p className="font-bold text-blue-950 text-[8.5px] sm:text-[10px] pb-0.5">À votre charge :</p>
                                                            <p className="leading-tight">•  Terrassement / empièrement (si nécessaire)</p>
                                                            <p className="leading-tight">•  Tranchée du bâtiment jusqu'au point de livraison (compteur)</p>
                                                            <p className="leading-tight">•  Équipements optionnels : chéneaux / bardage / évacuation des eaux pluviales / portails / autres..</p>
                                                            <p className="leading-tight">•  Aménagement SDIS si inexistant</p>
                                                            <p className="leading-tight">•  Équipement ERP : extincteurs / accès handicapés / autres..</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 3. Vue Façade Sud */}
                                                <div className="flex justify-center items-center w-full h-[100px] sm:h-[120px] overflow-hidden">
                                                    {images.facadeSud ? (
                                                        <div 
                                                            className="w-full h-full flex items-center justify-center overflow-hidden"
                                                            style={{ clipPath: `inset(${settings.facadeSud.cropTop}% ${settings.facadeSud.cropRight}% ${settings.facadeSud.cropBottom}% ${settings.facadeSud.cropLeft}%)` }}
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

                                                {/* 4. Photo 3D Réaliste avec coins arrondis */}
                                                <div className="flex justify-center items-center w-full pt-1">
                                                    <img 
                                                        src={photoUrl} 
                                                        alt="Rendu 3D Réaliste" 
                                                        className="w-full max-h-[140px] sm:max-h-[170px] rounded-xl shadow-sm object-cover"
                                                    />
                                                </div>

                                                {/* Disclaimer */}
                                                <p className="text-[7.5px] sm:text-[8.5px] text-slate-500 text-center italic">
                                                    Des modifications mineures pourront être apportées en fonction de l'évolution des panneaux photovoltaïques
                                                </p>
                                            </div>
                                        </div>

                                        {/* 3. FOOTER */}
                                        <div className="mt-4 pt-2 border-t border-slate-300 flex justify-between items-center text-[7.5px] sm:text-[9px] text-slate-500">
                                            <span>Les droits d'exploitation et de propriété intellectuelle appartiennent à ENR COURTAGE. Document confidentiel et non contractuel.</span>
                                            <span className="font-semibold text-slate-600">contact@enr-courtage.fr • enr-courtage.fr</span>
                                        </div>

                                    </div>
                                </div>
                            );
                        })()
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
