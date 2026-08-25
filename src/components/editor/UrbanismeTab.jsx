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
import { preloadProjectImages } from '@/utils/imageProxy';

const BATTERY_PHOTO = "https://nelsonpv.fr/mercury_product_photo.jpg"; // Placeholder for image 3

export default function UrbanismeTab({ project, updateProject, setActiveTab }) {
    const [loadingCadastre, setLoadingCadastre] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [captures, setCaptures] = useState({});
    const [step, setStep] = useState('idle'); // 'idle', 'capturing', 'rendering', 'done'
    const [captureStep, setCaptureStep] = useState('');
    const [mairie, setMairie] = useState(null);
    const [loadingMairie, setLoadingMairie] = useState(false);
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
                    cadastre_plu: pluZone,
                    cadastre_geometry: data.geometry
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
            // Fetch Mairie si non présente
            if (project?.cadastre_code_insee && (!mairie || !mairie.nom)) {
                setCaptureStep('Récupération données Mairie...');
                const mairieData = await cadastreService.fetchMairie(project.cadastre_code_insee);
                if (mairieData) {
                    setMairie(mairieData);
                    await wait(500); // laisser le temps au DOM de se mettre à jour
                }
            }
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
                    newCaptures.masse_edl = newCaptures.masse_projet; 
                    newCaptures.env_proche = newCaptures.ign; // Fallback
                }

                setCaptures(newCaptures);
                updateProject({ urbanisme_captures: newCaptures });
            }
            
            setStep('rendering');
            setCaptureStep('Génération des planches...');

            // 6. Rendu des planches demandées (Séquence complète)
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
            
            // Préchargement sécurisé des images via le proxy
            setCaptureStep('Sécurisation des images (Proxy CORS)...');
            const safeProject = await preloadProjectImages(project);
            if (safeProject.urbanisme_captures) {
                setCaptures(safeProject.urbanisme_captures);
            }
            await new Promise(r => setTimeout(r, 250));

            const platePromises = plateIds.map(async (id) => {
                const el = document.getElementById(id);
                if (el) {
                    await new Promise(r => setTimeout(r, 200));
                    const canvas = await html2canvas(el, { 
                        scale: 2,
                        useCORS: true,
                        allowTaint: false,
                        logging: false,
                        imageTimeout: 15000
                    });
                    return { id, data: canvas.toDataURL('image/jpeg', 0.95) };
                }
                return null;
            });

            const renderedPlates = await Promise.all(platePromises);
            const platesMap = {};
            renderedPlates.forEach(p => { if (p) platesMap[p.id] = p.data; });

            // 7. Génération PDF via le service
            setCaptureStep('Assemblage PDF...');
            const { generateDPDossier } = await import("@/services/DPGeneratorService");
            await generateDPDossier({ ...safeProject, dp_data: dpData }, platesMap);

            toast({ title: "Succès", description: "Le dossier DP a été généré avec succès." });
        } catch (err) {
            console.error("DP Generation error", err);
            toast({ title: "Erreur", description: "Échec de la génération du dossier.", variant: "destructive" });
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
            <div className={`absolute top-0 left-0 w-full h-1 bg-${color}-500`}></div>
            <span className={`text-[8px] font-black ${selectedPlateId === id ? 'text-blue-600' : `text-${color}-600`} mb-1 uppercase tracking-widest`}>{id}</span>
            <Icon size={24} className={`${selectedPlateId === id ? 'text-blue-500' : `text-${color}-300 group-hover:text-${color}-500`} transition-colors`} />
            <span className="text-[9px] font-bold mt-2 text-slate-700 uppercase text-center px-1">{label}</span>
        </Card>
    );

    return (
        <div className="flex flex-col gap-6 p-4 lg:p-8 bg-[#f1f5f9] min-h-screen">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Dossier Urbanisme (DP)</h2>
                </div>
                <Button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 py-6 font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                    {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Download className="mr-2" />}
                    Générer Dossier DP complet
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Colonne Gauche: Formulaire (ex-Configuration) */}
                <div className="lg:col-span-4 space-y-6">
                        <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
                            <CardHeader className="bg-white border-b border-slate-100">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <FileText className="text-blue-600" size={18} />
                                    Données cadastrales
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500">Section</Label>
                                        <Input className="rounded-xl border-slate-200 focus:ring-blue-500" value={project?.cadastre_section || ''} onChange={e => updateProject({ cadastre_section: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500">N° Parcelle</Label>
                                        <Input className="rounded-xl border-slate-200 focus:ring-blue-500" value={project?.cadastre_numero || ''} onChange={e => updateProject({ cadastre_numero: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500">Commune</Label>
                                    <Input className="rounded-xl border-slate-200 focus:ring-blue-500" value={project?.cadastre_commune || ''} onChange={e => updateProject({ cadastre_commune: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500">Surface (m²)</Label>
                                    <Input className="rounded-xl border-slate-200 focus:ring-blue-500" type="number" value={project?.cadastre_surface || ''} onChange={e => updateProject({ cadastre_surface: e.target.value })} />
                                </div>

                                <Button 
                                    variant="outline" 
                                    className="w-full rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 font-bold" 
                                    onClick={handleFetchCadastre}
                                    disabled={loadingCadastre}
                                >
                                    {loadingCadastre ? <Loader2 className="animate-spin mr-2" size={16} /> : <MapIcon className="mr-2" size={16} />}
                                    Actualiser via GPS
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                            <h4 className="text-sm font-bold text-slate-800">Séquence du dossier</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <PlateCard id="PAGE 1" label="Garde" icon={ImageIcon} color="slate" />
                                <PlateCard id="DP 1" label="Situation" icon={MapIcon} color="blue" />
                                <PlateCard id="DP 2" label="Masse" icon={MapIcon} color="blue" />
                                <PlateCard id="DP 3" label="Coupe" icon={ImageIcon} color="blue" />
                                <PlateCard id="DP 4" label="Façades" icon={ImageIcon} color="blue" />
                                <PlateCard id="DP 7" label="Environ." icon={ImageIcon} color="blue" />
                                <PlateCard id="DP 8.1" label="Notice" icon={FileText} color="blue" />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Colonne Droite: Demande DP */}
                <div className="lg:col-span-8">
                    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
                            <CardContent className="p-10 space-y-12">
                                {/* Dashboard Header */}
                                <div className="flex justify-between items-center pb-8 border-b border-slate-100">
                                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                        <FileText className="text-blue-600" size={24} />
                                        Demande de Déclaration Préalable (DP)
                                    </h3>
                                </div>

                            {/* Section 1: Parcelle & Mairie */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Parcelles cadastrales</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400 font-medium">IDU</span>
                                            <span className="text-slate-900 font-bold">{project?.cadastre_code_insee || project?.zip || ''}{project?.cadastre_section || ''}{project?.cadastre_numero || ''}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400 font-medium">Section / N°</span>
                                            <span className="text-slate-900 font-bold">{project?.cadastre_section || '—'} / {project?.cadastre_numero || '—'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400 font-medium">Commune</span>
                                            <span className="text-slate-900 font-bold">{project?.cadastre_commune || project?.city || '—'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400 font-medium">Code INSEE</span>
                                            <span className="text-slate-900 font-bold">{project?.cadastre_code_insee || '—'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400 font-medium">Surface</span>
                                            <span className="text-slate-900 font-bold">{project?.cadastre_surface ? `${project.cadastre_surface} m²` : '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mairie</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400 font-medium">Nom</span>
                                            <span className="text-slate-900 font-bold uppercase">{mairie?.nom || `Mairie ${project?.city || '—'}`}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400 font-medium">Tél</span>
                                            <span className="text-slate-900 font-bold">{mairie?.telephone || '05 00 00 00 00'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400 font-medium">Email</span>
                                            <span className="text-blue-600 font-bold underline cursor-pointer">{mairie?.email || 'mairie@commune.fr'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400 font-medium">Adresse</span>
                                            <span className="text-slate-900 font-bold text-right max-w-[200px] leading-tight">{mairie?.adresse || '—'}, {project?.zip} {project?.city}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Adresse */}
                            <div className="space-y-6 pt-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Adresse du site</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 font-medium">Adresse</span>
                                        <span className="text-slate-900 font-bold text-right max-w-[200px]">{project?.address || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 font-medium">Code postal</span>
                                        <span className="text-slate-900 font-bold">{project?.zip || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 font-medium">GPS</span>
                                        <span className="text-slate-900 font-mono font-bold text-xs">{project?.gps || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 font-medium">Altitude</span>
                                        <span className="text-slate-900 font-bold">294 m</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Notice */}
                            <div className="space-y-4 pt-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Notice descriptive du projet</h4>
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed">
                                    Le projet consiste en l'installation d'un système de stockage d'énergie par batterie de type {project?.battery_model || 'CESC Mercury 261'} sur la parcelle cadastrale {project?.cadastre_code_insee || ''} (section {project?.cadastre_section || '—'}, n°{project?.cadastre_numero || '—'}) située sur la commune de {project?.cadastre_commune || project?.city || '—'}, à l'adresse {project?.address || '—'}.
                                    <br/><br/>
                                    L'installation comprend {project?.battery_quantity || 2} armoires de stockage pour une puissance totale de {(project?.battery_quantity || 2) * 125} kW et une capacité de {(project?.battery_quantity || 2) * 261} kWh. Chaque armoire mesure 2,40 m de haut, 1,00 m de large et 1,35 m de profondeur, pour un poids unitaire d'environ 4 tonnes.
                                </div>
                            </div>

                            {/* Section 4: Aperçus */}
                            <div className="space-y-8 pt-8">
                                <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Aperçu du dossier DP</h4>
                                    <span className="text-[10px] text-slate-400 font-bold">Génération des aperçus...</span>
                                </div>
                                <div className="grid grid-cols-1 gap-12">
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page de garde</p>
                                        <div className="w-full aspect-[297/210] bg-slate-50 rounded-2xl border-4 border-slate-100 overflow-hidden shadow-xl flex items-center justify-center">
                                            <div className="scale-[0.4] lg:scale-[0.6] origin-center w-[297mm] h-[210mm] bg-white">
                                                <PlateCover project={{ ...project, dp_data: dpData }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DP1 — Plan de situation</p>
                                        <div className="w-full aspect-[297/210] bg-slate-50 rounded-2xl border-4 border-slate-100 overflow-hidden shadow-xl flex items-center justify-center">
                                            <div className="scale-[0.4] lg:scale-[0.6] origin-center w-[297mm] h-[210mm] bg-white">
                                                <PlateSituation project={project} captures={captures} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notice d'insertion (DP 8.1)</p>
                                        <div className="w-full aspect-[297/210] bg-slate-50 rounded-2xl border-4 border-slate-100 overflow-hidden shadow-xl flex items-center justify-center">
                                            <div className="scale-[0.4] lg:scale-[0.6] origin-center w-[297mm] h-[210mm] bg-white">
                                                <PlateInsertionNotice project={project} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <div className="fixed left-[-9999px] top-0 no-print pointer-events-none">
                <div id="dp-plate-cover"><PlateCover project={{ ...project, dp_data: dpData }} /></div>
                <div id="dp-plate-situation"><PlateSituation project={project} captures={captures} /></div>
                <div id="dp-plate-masse"><PlateMasse project={project} captures={captures} /></div>
                <div id="dp-plate-section"><PlateSection project={project} /></div>
                <div id="dp-plate-facades"><PlateFacades project={project} batteryPhoto={BATTERY_PHOTO} /></div>
                <div id="dp-plate-aspect"><PlateAspect project={project} batteryPhoto={BATTERY_PHOTO} /></div>
                <div id="dp-plate-insertion"><PlateInsertion project={project} captures={captures} /></div>
                <div id="dp-plate-env-proche"><PlateEnvProche project={project} captures={captures} /></div>
                <div id="dp-plate-env-lointain"><PlateEnvLointain project={project} captures={captures} /></div>
                <div id="dp-plate-notice-insertion"><PlateInsertionNotice project={project} /></div>
            </div>
        </div>
    );
}
