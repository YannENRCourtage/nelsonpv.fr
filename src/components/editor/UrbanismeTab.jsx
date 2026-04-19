import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Map as MapIcon, Image as ImageIcon, Download, Loader2, CheckCircle2, Camera } from 'lucide-react';
import { cadastreService } from "@/services/CadastreService";
import { toast } from "@/components/ui/use-toast";
import { PlateSituation, PlateMasse, PlateNotice } from './DPPlates';
import html2canvas from 'html2canvas';

export default function UrbanismeTab({ project, updateProject }) {
    const [loadingCadastre, setLoadingCadastre] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [captures, setCaptures] = useState({});
    const [step, setStep] = useState('idle'); // 'idle', 'capturing', 'rendering', 'done'
    const [captureStep, setCaptureStep] = useState('');

    // Load existing captures from project
    useEffect(() => {
        if (project?.urbanisme_captures) {
            setCaptures(project.urbanisme_captures);
        }
    }, [project?.id]);

    const handleFetchCadastre = async () => {
        if (!project?.gps) return;
        setLoadingCadastre(true);
        try {
            const [lat, lng] = project.gps.split(',').map(v => parseFloat(v.trim()));
            const data = await cadastreService.getParcelle(lat, lng);
            if (data) {
                updateProject({
                    cadastre_section: data.section,
                    cadastre_numero: data.numero,
                    cadastre_surface: data.contenance,
                    cadastre_commune: data.nom_commune
                });
                toast({ title: "Cadastre récupéré", description: `Section ${data.section} N°${data.numero}` });
            }
        } catch (err) {
            console.error("Fetch cadastre error", err);
        } finally {
            setLoadingCadastre(false);
        }
    };

    // Auto-fetch cadastre if empty
    useEffect(() => {
        if (project?.gps && !project?.cadastre_section && !loadingCadastre) {
            handleFetchCadastre();
        }
    }, [project?.gps]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setStep('capturing');
        const newCaptures = {};

        const wait = (ms) => new Promise(res => setTimeout(res, ms));

        try {
            // 1. Capture IGN
            setCaptureStep('Plan IGN...');
            window.dispatchEvent(new CustomEvent('map:toggle-basemap', { detail: { id: 'ign' } }));
            await wait(2000);
            newCaptures.ign = await requestMapCapture();

            // 2. Capture Satellite
            setCaptureStep('Vue Aérienne...');
            window.dispatchEvent(new CustomEvent('map:toggle-basemap', { detail: { id: 'satellite' } }));
            await wait(2000);
            newCaptures.satellite = await requestMapCapture();

            // 3. Capture Cadastre
            setCaptureStep('Cadastre...');
            window.dispatchEvent(new CustomEvent('map:toggle-layer', { detail: { layerKey: 'cadastre' } }));
            await wait(1500);
            newCaptures.cadastre = await requestMapCapture();
            window.dispatchEvent(new CustomEvent('map:toggle-layer', { detail: { layerKey: 'cadastre' } })); // disable back

            // 4. Capture Masse EDL
            setCaptureStep('Plan de masse (État des lieux)...');
            // Cacher les bâtiments pour l'EDL
            window.dispatchEvent(new CustomEvent('map:toggle-features', { detail: { visible: false } }));
            await wait(500);
            newCaptures.masse_edl = await requestMapCapture();

            // 5. Capture Masse Projet
            setCaptureStep('Plan de masse (Projet)...');
            window.dispatchEvent(new CustomEvent('map:toggle-features', { detail: { visible: true } }));
            // S'assurer que le PDL est visible
            await wait(500);
            newCaptures.masse_projet = await requestMapCapture();

            setCaptures(newCaptures);
            
            // Persist captures to project
            updateProject({ urbanisme_captures: newCaptures });
            
            setStep('rendering');

            // 6. Rendu des planches (DOM -> Canvas)
            await wait(1000); // Laisser le temps au DOM de se mettre à jour
            const plates = {};
            const plateIds = ['dp-plate-situation', 'dp-plate-masse', 'dp-plate-notice'];
            
            for (const id of plateIds) {
                const el = document.getElementById(id);
                if (el) {
                    const canvas = await html2canvas(el, { scale: 2 });
                    plates[id] = canvas.toDataURL('image/png');
                }
            }

            // 7. Génération PDF via le service
            setCaptureStep('Génération du PDF final...');
            const { generateDPDossier } = await import("@/services/DPGeneratorService");
            await generateDPDossier(project, plates);

            setStep('idle');
            toast({ title: "Succès", description: "Le dossier DP a été généré." });
        } catch (err) {
            console.error("DP Generation error", err);
            toast({ title: "Erreur", description: "Échec de la génération du dossier.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
            setStep('idle');
        }
    };

    const requestMapCapture = () => {
        return new Promise((resolve) => {
            const handleCapture = (e) => {
                window.removeEventListener('map:capture-response', handleCapture);
                resolve(e.detail.dataUrl);
            };
            window.addEventListener('map:capture-response', handleCapture);
            window.dispatchEvent(new CustomEvent('map:capture-request', { detail: { slotIndex: -1 } }));
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 bg-gray-50 h-full overflow-y-auto">
            {/* Formulaire de Données DP */}
            <div className="lg:col-span-4 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="text-blue-600" />
                            Données du Dossier DP
                        </CardTitle>
                        <CardDescription>Informations requises pour le Cerfa 13404</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Section Cadastrale</Label>
                                <Input 
                                    value={project?.cadastre_section || ''} 
                                    onChange={e => updateProject({ cadastre_section: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Numéro de Parcelle</Label>
                                <Input 
                                    value={project?.cadastre_numero || ''} 
                                    onChange={e => updateProject({ cadastre_numero: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Surface terrain (m²)</Label>
                            <Input 
                                type="number"
                                value={project?.cadastre_surface || ''} 
                                onChange={e => updateProject({ cadastre_surface: e.target.value })}
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            className="w-full text-xs" 
                            onClick={handleFetchCadastre}
                            disabled={loadingCadastre}
                        >
                            {loadingCadastre ? <Loader2 className="animate-spin mr-2" size={14} /> : <MapIcon className="mr-2" size={14} />}
                            Actualiser depuis le GPS
                        </Button>

                        <div className="pt-4 border-t space-y-4">
                            <h4 className="font-semibold text-sm">Options de construction</h4>
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-blue-900">Batteries Mercury 261</p>
                                    <p className="text-xs text-blue-700">Inclusion automatique (x2 sur dalle)</p>
                                </div>
                                <CheckCircle2 className="text-blue-600" size={20} />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-amber-900">Toiture Bac Acier</p>
                                    <p className="text-xs text-amber-700">RAL 7016 + PV Noir RAL 9005</p>
                                </div>
                                <CheckCircle2 className="text-amber-600" size={20} />
                            </div>
                        </div>

                        <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-bold shadow-lg mt-6"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                        >
                            {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Download className="mr-2" />}
                            {isGenerating ? "Génération..." : "Générer le Dossier DP"}
                        </Button>
                        {isGenerating && (
                            <p className="text-center text-[10px] text-blue-600 mt-2 font-bold animate-pulse">
                                {captureStep}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Aperçu des planches (caché mais présent pour le rendu) */}
            <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    {/* Fake previews */}
                    <Card className="aspect-[3/4] flex flex-col items-center justify-center bg-white border shadow-sm">
                         <span className="text-xs font-bold text-blue-800 mb-2">PAGE 1</span>
                         <FileText size={48} className="text-blue-100" />
                         <span className="text-[10px] uppercase mt-2 text-gray-500">Cerfa 13404</span>
                    </Card>
                    <Card className="aspect-[3/4] flex flex-col items-center justify-center bg-white border shadow-sm">
                         <span className="text-xs font-bold text-blue-800 mb-2">DP 1</span>
                         <MapIcon size={48} className="text-blue-100" />
                         <span className="text-[10px] uppercase mt-2 text-gray-500">Situation</span>
                    </Card>
                    <Card className="aspect-[3/4] flex flex-col items-center justify-center bg-white border shadow-sm">
                         <span className="text-xs font-bold text-blue-800 mb-2">DP 2</span>
                         <MapIcon size={48} className="text-blue-100" />
                         <span className="text-[10px] uppercase mt-2 text-gray-500">Masse</span>
                    </Card>
                    <Card className="aspect-[3/4] flex flex-col items-center justify-center bg-white border shadow-sm">
                         <span className="text-xs font-bold text-blue-800 mb-2">DP 4</span>
                         <ImageIcon size={48} className="text-blue-100" />
                         <span className="text-[10px] uppercase mt-2 text-gray-500">Notice</span>
                    </Card>
                </div>

                {/* Hidden container for actual rendering */}
                <div className="fixed left-[-9999px] top-0 pointer-events-none">
                    <PlateSituation project={project} captures={captures} />
                    <PlateMasse project={project} captures={captures} />
                    <PlateNotice project={project} captures={captures} />
                </div>
            </div>
        </div>
    );
}
