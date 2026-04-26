import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Map as MapIcon, Image as ImageIcon, Download, Loader2, CheckCircle2, Camera } from 'lucide-react';
import { cadastreService } from "@/services/CadastreService";
import { toast } from "@/components/ui/use-toast";
import { PlateSituation, PlateMasse, PlateNotice, PlateCover, PlateSection, PlateFacades, PlateInsertionNotice, PlateAspect, PlateInsertion, PlateEnvProche, PlateEnvLointain } from './DPPlates';
import html2canvas from 'html2canvas';

const BATTERY_PHOTO = "https://nelsonpv.fr/mercury_product_photo.jpg"; // Placeholder for image 3

export default function UrbanismeTab({ project, updateProject, setActiveTab }) {
    const [loadingCadastre, setLoadingCadastre] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [captures, setCaptures] = useState({});
    const [step, setStep] = useState('idle'); // 'idle', 'capturing', 'rendering', 'done'
    const [captureStep, setCaptureStep] = useState('');
    const [mairie, setMairie] = useState(null);
    const [loadingMairie, setLoadingMairie] = useState(false);
    const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'review'
    const [selectedPlateId, setSelectedPlateId] = useState('CERFA'); // State for individual modification

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
                // Fetch PLU Zone
                let pluZone = "—";
                try {
                    const gpuData = await fetch(`https://apicarto.ign.fr/api/gpu/zone-urba?geom=${encodeURIComponent(JSON.stringify({ type: "Point", coordinates: [lng, lat] }))}`).then(res => res.json());
                    if (gpuData && gpuData.features && gpuData.features.length > 0) {
                        pluZone = gpuData.features[0].properties.libelle || "—";
                    }
                } catch (e) { console.warn("GPU API Error", e); }

                updateProject({
                    cadastre_section: data.section,
                    cadastre_numero: data.numero,
                    cadastre_surface: data.contenance,
                    cadastre_commune: data.nom_commune,
                    cadastre_code_insee: data.code_commune,
                    cadastre_plu: pluZone
                });
                toast({ title: "Données récupérées", description: `Section ${data.section} N°${data.numero} | Zone: ${pluZone}` });
                
                // Fetch Mairie
                setLoadingMairie(true);
                const mairieData = await cadastreService.fetchMairie(data.code_commune);
                if (mairieData) setMairie(mairieData);
                setLoadingMairie(false);
            }
        } catch (err) {
            console.error("Fetch cadastre error", err);
        } finally {
            setLoadingCadastre(false);
        }
    };

    // Parse IDU if present
    useEffect(() => {
        if (project?.cadastre_code_insee && project.cadastre_code_insee.length >= 10 && !project.cadastre_section) {
            const idu = project.cadastre_code_insee;
            // Format IDU type: 322700B0718
            const section = idu.substring(5, 7);
            const numero = idu.substring(7);
            updateProject({
                cadastre_section: section,
                cadastre_numero: numero
            });
        }
    }, [project?.cadastre_code_insee]);

    // Auto-fetch cadastre if empty
    useEffect(() => {
        if (project?.gps && !project?.cadastre_section && !loadingCadastre) {
            handleFetchCadastre();
        }
    }, [project?.gps]);

    const [dpData, setDpData] = useState({
        notice_objat: "Installation de deux unités de stockage par batteries stationnaires sur dalle béton.",
        notice_insertion: "Le projet s'implante sur une zone plane et dégagée, sans impact sur le voisinage ou l'environnement immédiat.",
        material_walls: "Acier galvanisé et thermo-laqué",
        color_walls: "Blanc (RAL 9003) et Gris Anthracite (RAL 7016)",
        cover_branding: "NELSONPV.FR"
    });

    useEffect(() => {
        if (project?.dp_data) {
            setDpData(prev => ({ ...prev, ...project.dp_data }));
        }
    }, [project?.id]);

    const handleUpdateDpData = (updates) => {
        const newData = { ...dpData, ...updates };
        setDpData(newData);
        updateProject({ dp_data: newData });
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setStep('capturing');
        
        const wait = (ms) => new Promise(res => setTimeout(res, ms));
        const newCaptures = { ...captures };

        try {
            // Uniquement si les captures sont manquantes
            if (!newCaptures.ign || !newCaptures.satellite || !newCaptures.cadastre || !newCaptures.masse_projet) {
                // 1. Capture IGN
                if (!newCaptures.ign) {
                    setCaptureStep('Capture IGN...');
                    window.dispatchEvent(new CustomEvent('map:toggle-basemap', { detail: { id: 'ign' } }));
                    await wait(800);
                    newCaptures.ign = await requestMapCapture();
                }

                // 2. Capture Satellite
                if (!newCaptures.satellite) {
                    setCaptureStep('Capture Satellite...');
                    window.dispatchEvent(new CustomEvent('map:toggle-basemap', { detail: { id: 'satellite' } }));
                    await wait(800);
                    newCaptures.satellite = await requestMapCapture();
                }

                // 3. Capture Cadastre
                if (!newCaptures.cadastre) {
                    setCaptureStep('Capture Cadastre...');
                    window.dispatchEvent(new CustomEvent('map:toggle-layer', { detail: { layerKey: 'cadastre' } }));
                    await wait(800);
                    newCaptures.cadastre = await requestMapCapture();
                    window.dispatchEvent(new CustomEvent('map:toggle-layer', { detail: { layerKey: 'cadastre' } }));
                }

                // 4. Capture Masse Projet
                if (!newCaptures.masse_projet) {
                    setCaptureStep('Capture Masse...');
                    window.dispatchEvent(new CustomEvent('map:toggle-features', { detail: { visible: true } }));
                    await wait(500);
                    newCaptures.masse_projet = await requestMapCapture();
                    newCaptures.masse_edl = newCaptures.masse_projet; // Simplification pour vitesse
                }

                setCaptures(newCaptures);
                updateProject({ urbanisme_captures: newCaptures });
            }
            
            setStep('rendering');
            setCaptureStep('Génération des planches...');

            // 6. Rendu des planches en PARALLÈLE
            const plateIds = [
                'dp-plate-cover',
                'dp-plate-situation', 
                'dp-plate-masse', 
                'dp-plate-section',
                'dp-plate-facades',
                'dp-plate-aspect',
                'dp-plate-insertion',
                'dp-plate-env-proche',
                'dp-plate-env-lointain',
                'dp-plate-notice-insertion'
            ];
            
            const platePromises = plateIds.map(async (id) => {
                const el = document.getElementById(id);
                if (el) {
                    const canvas = await html2canvas(el, { 
                        scale: 1.5,
                        useCORS: true,
                        allowTaint: true,
                        logging: false,
                        imageTimeout: 10000
                    });
                    return { id, data: canvas.toDataURL('image/jpeg', 0.8) };
                }
                return null;
            });

            const renderedPlates = await Promise.all(platePromises);
            const platesMap = {};
            renderedPlates.forEach(p => { if (p) platesMap[p.id] = p.data; });

            // 7. Génération PDF via le service
            setCaptureStep('Assemblage PDF...');
            const { generateDPDossier } = await import("@/services/DPGeneratorService");
            await generateDPDossier({ ...project, dp_data: dpData }, platesMap);

            toast({ title: "Succès", description: "Le dossier DP a été généré." });
        } catch (err) {
            console.error("DP Generation error", err);
            toast({ title: "Erreur", description: "Échec de la génération.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
            setStep('idle');
            setCaptureStep('');
        }
    };

    const requestMapCapture = () => {
        return new Promise((resolve) => {
            const handleCapture = (e) => {
                window.removeEventListener('map:capture-done', handleCapture);
                resolve(e.detail.dataUrl);
            };
            window.addEventListener('map:capture-done', handleCapture);
            window.dispatchEvent(new CustomEvent('map:capture-request', { detail: { slotIndex: -1 } }));
        });
    };

    const PlateCard = ({ id, label, icon: Icon, color = "blue" }) => (
        <Card 
            onClick={() => setSelectedPlateId(id)}
            className={`aspect-[297/210] flex flex-col items-center justify-center transition-all cursor-pointer group shadow-sm overflow-hidden relative ${selectedPlateId === id ? 'border-blue-600 ring-2 ring-blue-100 bg-blue-50' : 'bg-white border-2 border-slate-100 hover:border-blue-300'}`}
        >
            <div className={`absolute top-0 left-0 w-full h-1.5 bg-${color}-500 opacity-20`}></div>
            <span className={`text-[9px] font-black ${selectedPlateId === id ? 'text-blue-600' : `text-${color}-600`} mb-1 uppercase tracking-tighter`}>{id}</span>
            <Icon size={32} className={`${selectedPlateId === id ? 'text-blue-500' : `text-${color}-200 group-hover:text-${color}-400`} transition-colors`} />
            <span className="text-[10px] font-bold mt-2 text-slate-700 uppercase text-center px-2">{label}</span>
            <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-all flex items-center justify-center">
                <Button variant="ghost" size="sm" className={`opacity-0 group-hover:opacity-100 bg-white shadow-md text-blue-600 font-bold h-6 px-2 text-[10px] rounded-lg ${selectedPlateId === id ? 'hidden' : ''}`}>Modifier</Button>
            </div>
        </Card>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 bg-slate-50 h-full overflow-y-auto">
            {/* Header / Mode Toggle */}
            <div className="lg:col-span-12 flex justify-between items-center mb-2">
                <div className="flex gap-2">
                    <Button 
                        variant={viewMode === 'edit' ? 'default' : 'outline'} 
                        onClick={() => setViewMode('edit')}
                        className="rounded-full px-6 font-bold"
                    >
                        Édition des données
                    </Button>
                    <Button 
                        variant={viewMode === 'review' ? 'default' : 'outline'} 
                        onClick={() => setViewMode('review')}
                        className="rounded-full px-6 font-bold"
                    >
                        Aperçu du dossier
                    </Button>
                </div>
                {viewMode === 'review' && (
                    <Button 
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 font-black shadow-lg"
                    >
                        {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Download className="mr-2" />}
                        Télécharger Dossier DP complet
                    </Button>
                )}
            </div>

            {viewMode === 'edit' ? (
                <>
                <div className="lg:col-span-4 space-y-6">
                <Card className="rounded-3xl border-none shadow-xl sticky top-0">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="text-blue-600" size={20} />
                            {selectedPlateId ? `Édition : ${selectedPlateId}` : "Données du Dossier"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-5">
                        {/* Dynamic fields based on selected plate */}
                        {(selectedPlateId === 'CERFA' || selectedPlateId === 'PAGE 1' || !selectedPlateId) && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold text-slate-400">Section Cadastrale</Label>
                                        <Input className="h-9 rounded-lg" value={project?.cadastre_section || ''} onChange={e => updateProject({ cadastre_section: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold text-slate-400">Numéro Parcelle</Label>
                                        <Input className="h-9 rounded-lg" value={project?.cadastre_numero || ''} onChange={e => updateProject({ cadastre_numero: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Nom du Projet</Label>
                                    <Input className="h-9 rounded-lg" value={project?.name || ''} onChange={e => updateProject({ name: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Branding Couverture</Label>
                                    <Input className="h-9 rounded-lg" value={dpData.cover_branding} onChange={e => handleUpdateDpData({ cover_branding: e.target.value })} />
                                </div>
                            </div>
                        )}

                        {(selectedPlateId === 'DP 3' || selectedPlateId === 'DP 4' || selectedPlateId === 'DP 5') && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Modèle de Batterie</Label>
                                    <Input className="h-9 rounded-lg" value={project?.battery_model || 'CESC Mercury 261'} onChange={e => updateProject({ battery_model: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold text-slate-400">Matériau Parois</Label>
                                        <Input className="h-9 rounded-lg" value={dpData.material_walls || 'Acier galvanisé'} onChange={e => handleUpdateDpData({ material_walls: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold text-slate-400">Coloris (RAL)</Label>
                                        <Input className="h-9 rounded-lg" value={dpData.color_walls || '7016'} onChange={e => handleUpdateDpData({ color_walls: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedPlateId === 'DP 8.1' && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Objet de la demande</Label>
                                    <textarea 
                                        className="w-full min-h-[100px] p-2.5 text-xs rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                                        value={dpData.notice_objat}
                                        onChange={e => handleUpdateDpData({ notice_objat: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Insertion paysagère</Label>
                                    <textarea 
                                        className="w-full min-h-[120px] p-2.5 text-xs rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-100"
                                        value={dpData.notice_insertion}
                                        onChange={e => handleUpdateDpData({ notice_insertion: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {['DP 1', 'DP 2', 'DP 6', 'DP 7', 'DP 8'].includes(selectedPlateId) && (
                            <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                                <MapIcon className="mx-auto text-slate-300" size={32} />
                                <p className="text-[11px] font-medium text-slate-500">Cette page ({selectedPlateId}) utilise les captures cartographiques automatiques.</p>
                                <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => setActiveTab('map')}>Ajuster la vue sur la carte</Button>
                            </div>
                        )}

                        <div className="pt-4 border-t space-y-3">
                            <Button 
                                variant="secondary" 
                                className="w-full h-9 rounded-lg text-[10px] font-bold" 
                                onClick={handleFetchCadastre}
                                disabled={loadingCadastre}
                            >
                                {loadingCadastre ? <Loader2 className="animate-spin mr-2" size={12} /> : <MapIcon className="mr-2" size={12} />}
                                Récupérer Infos Mairie & Cadastre
                            </Button>

                            <Button 
                                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-sm font-black shadow-lg rounded-xl transition-all"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Download className="mr-2" size={18} />}
                                {isGenerating ? "GÉNÉRATION..." : "GÉNÉRER LE PDF COMPLET"}
                            </Button>
                            
                            {isGenerating && (
                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
                                    <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest animate-pulse">{captureStep}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Aperçu des planches en paysage */}
            <div className="lg:col-span-8">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Séquence du Dossier <span className="text-blue-600">DP</span></h3>
                    <div className="px-4 py-1.5 bg-white rounded-full border shadow-sm text-[10px] font-bold text-slate-500 uppercase tracking-widest">Format A4 Paysage</div>
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    <PlateCard id="CERFA" label="Cerfa 13404" icon={FileText} color="blue" />
                    <PlateCard id="PAGE 1" label="Page de Garde" icon={ImageIcon} color="slate" />
                    <PlateCard id="DP 1" label="Plan de Situation" icon={MapIcon} color="blue" />
                    <PlateCard id="DP 2" label="Plan de Masse" icon={MapIcon} color="blue" />
                    <PlateCard id="DP 3" label="Plan en Coupe" icon={ImageIcon} color="amber" />
                    <PlateCard id="DP 4" label="Façades / Toit" icon={ImageIcon} color="amber" />
                    <PlateCard id="DP 5" label="Aspect Ext." icon={ImageIcon} color="emerald" />
                    <PlateCard id="DP 6" label="Insertion" icon={ImageIcon} color="emerald" />
                    <PlateCard id="DP 7" label="Env. Proche" icon={ImageIcon} color="rose" />
                    <PlateCard id="DP 8" label="Env. Lointain" icon={ImageIcon} color="rose" />
                    <PlateCard id="DP 8.1" label="Notice Insertion" icon={FileText} color="blue" />
                </div>

                <div className="mt-8 p-6 bg-blue-50/50 rounded-[2rem] border-2 border-dashed border-blue-100 flex items-center gap-4 text-blue-800">
                    <Camera className="text-blue-600 shrink-0" />
                    <p className="text-xs font-medium leading-relaxed">
                        Les captures de plans (IGN, Satellite, Cadastre) sont effectuées automatiquement lors de la génération. 
                        Assurez-vous que la vue cartographique est bien centrée sur le projet avant de lancer la création.
                    </p>
                </div>

                </div>
                </>
            ) : (
                /* --- REVIEW MODE (Hangar3d style) --- */
                <div className="lg:col-span-12 space-y-8 pb-20 max-w-5xl mx-auto w-full">
                    <div className="text-center space-y-2 mb-10">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-3">
                            <FileText size={36} className="text-blue-600" />
                            Demande de Déclaration Préalable (DP)
                        </h2>
                        <p className="text-slate-500 font-medium uppercase tracking-widest text-sm">{project?.name || 'Projet Nelson'}</p>
                    </div>

                    <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
                        <CardContent className="p-10 space-y-12">
                            {/* Grid 1: Parcelle & Mairie */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                                        <MapIcon size={14} /> Parcelles cadastrales
                                    </h3>
                                    <div className="grid grid-cols-2 gap-y-4 text-sm">
                                        <div className="text-slate-400 font-medium">IDU</div>
                                        <div className="text-slate-900 font-bold">{project?.cadastre_code_insee || '32270'}{project?.cadastre_section || '0B'}{project?.cadastre_numero || '0718'}</div>
                                        
                                        <div className="text-slate-400 font-medium">Section / N°</div>
                                        <div className="text-slate-900 font-bold">{project?.cadastre_section || '—'} / {project?.cadastre_numero || '—'}</div>
                                        
                                        <div className="text-slate-400 font-medium">Commune</div>
                                        <div className="text-slate-900 font-bold">{project?.cadastre_commune || '—'}</div>
                                        
                                        <div className="text-slate-400 font-medium">Surface</div>
                                        <div className="text-slate-900 font-bold">{project?.cadastre_surface ? `${project.cadastre_surface} m²` : '—'}</div>
                                        
                                        <div className="text-slate-400 font-medium">Zone PLU</div>
                                        <div className="text-slate-900 font-bold">—</div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-amber-600 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                                        <CheckCircle2 size={14} /> Mairie
                                    </h3>
                                    <div className="grid grid-cols-2 gap-y-4 text-sm">
                                        <div className="text-slate-400 font-medium">Nom</div>
                                        <div className="text-slate-900 font-bold uppercase">{mairie?.nom || `Mairie ${project?.city || '—'}`}</div>
                                        
                                        <div className="text-slate-400 font-medium">Tél</div>
                                        <div className="text-slate-900 font-bold">{mairie?.telephone || '—'}</div>
                                        
                                        <div className="text-slate-400 font-medium">Email</div>
                                        <div className="text-slate-900 font-bold text-blue-600 underline cursor-pointer">{mairie?.email || '—'}</div>
                                        
                                        <div className="text-slate-400 font-medium">Adresse</div>
                                        <div className="text-slate-900 font-bold leading-tight">{mairie?.adresse || '—'}, {mairie?.code_postal || ''} {mairie?.commune || ''}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Adresse du site */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                                    <MapIcon size={14} /> Adresse du site
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-sm">
                                    <div className="grid grid-cols-2 gap-y-4">
                                        <div className="text-slate-400 font-medium">Adresse</div>
                                        <div className="text-slate-900 font-bold">{project?.address || '—'}</div>
                                        
                                        <div className="text-slate-400 font-medium">Code postal</div>
                                        <div className="text-slate-900 font-bold">{project?.zip || '—'}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-4">
                                        <div className="text-slate-400 font-medium">GPS</div>
                                        <div className="text-slate-900 font-mono font-bold text-xs">{project?.gps || '—'}</div>
                                        
                                        <div className="text-slate-400 font-medium">Altitude</div>
                                        <div className="text-slate-900 font-bold">294 m</div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Notice */}
                            <div className="space-y-4 pt-4">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <FileText size={14} /> Notice descriptive du projet
                                </h3>
                                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 italic text-slate-700 leading-relaxed text-sm">
                                    {dpData.notice_objat} {dpData.notice_insertion}
                                </div>
                            </div>

                            {/* Section 4: Aperçu des planches */}
                            <div className="space-y-8 pt-8">
                                <div className="flex justify-between items-end border-b pb-4">
                                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <ImageIcon size={14} /> Aperçu du dossier DP
                                    </h3>
                                    <span className="text-[10px] text-slate-400 font-bold italic">Aperçus dynamiques</span>
                                </div>
                                <div className="grid grid-cols-1 gap-20 py-10">
                                    <div className="space-y-4 flex flex-col items-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] self-start ml-4 md:ml-12 lg:ml-20">Page de garde</p>
                                        <div className="w-[90%] lg:w-[80%] aspect-[297/210] bg-white rounded-3xl border-8 border-slate-100 overflow-hidden shadow-2xl flex items-center justify-center bg-slate-50">
                                            <div className="scale-[0.45] origin-center w-[297mm] h-[210mm] pointer-events-none bg-white">
                                                <PlateCover project={{ ...project, dp_data: dpData }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 flex flex-col items-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] self-start ml-4 md:ml-12 lg:ml-20">DP1 — Plan de situation</p>
                                        <div className="w-[90%] lg:w-[80%] aspect-[297/210] bg-white rounded-3xl border-8 border-slate-100 overflow-hidden shadow-2xl flex items-center justify-center bg-slate-50">
                                            <div className="scale-[0.45] origin-center w-[297mm] h-[210mm] pointer-events-none bg-white">
                                                <PlateSituation project={{ ...project, dp_data: dpData }} captures={captures} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 flex flex-col items-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] self-start ml-4 md:ml-12 lg:ml-20">DP2 — Plan de masse</p>
                                        <div className="w-[90%] lg:w-[80%] aspect-[297/210] bg-white rounded-3xl border-8 border-slate-100 overflow-hidden shadow-2xl flex items-center justify-center bg-slate-50">
                                            <div className="scale-[0.45] origin-center w-[297mm] h-[210mm] pointer-events-none bg-white">
                                                <PlateMasse project={{ ...project, dp_data: dpData }} captures={captures} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 flex flex-col items-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] self-start ml-4 md:ml-12 lg:ml-20">DP6 — Insertion paysagère</p>
                                        <div className="w-[90%] lg:w-[80%] aspect-[297/210] bg-white rounded-3xl border-8 border-slate-100 overflow-hidden shadow-2xl flex items-center justify-center bg-slate-50">
                                            <div className="scale-[0.45] origin-center w-[297mm] h-[210mm] pointer-events-none bg-white">
                                                <PlateInsertion project={{ ...project, dp_data: dpData }} captures={captures} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Hidden container for actual high-quality rendering */}
            <div className="fixed left-[-9999px] top-0 pointer-events-none no-print">
                <div id="dp-plate-cover"><PlateCover project={{ ...project, dp_data: dpData }} /></div>
                <div id="dp-plate-situation"><PlateSituation project={{ ...project, dp_data: dpData }} captures={captures} /></div>
                <div id="dp-plate-masse"><PlateMasse project={{ ...project, dp_data: dpData }} captures={captures} /></div>
                <div id="dp-plate-section"><PlateSection project={{ ...project, dp_data: dpData }} /></div>
                <div id="dp-plate-facades"><PlateFacades project={{ ...project, dp_data: dpData }} batteryPhoto={BATTERY_PHOTO} /></div>
                <div id="dp-plate-aspect"><PlateAspect project={{ ...project, dp_data: dpData }} batteryPhoto={BATTERY_PHOTO} /></div>
                <div id="dp-plate-insertion"><PlateInsertion project={{ ...project, dp_data: dpData }} captures={captures} /></div>
                <div id="dp-plate-env-proche"><PlateEnvProche project={{ ...project, dp_data: dpData }} captures={captures} /></div>
                <div id="dp-plate-env-lointain"><PlateEnvLointain project={{ ...project, dp_data: dpData }} captures={captures} /></div>
                <div id="dp-plate-notice-insertion"><PlateInsertionNotice project={{ ...project, dp_data: dpData }} /></div>
            </div>
        </div>
    );
}
