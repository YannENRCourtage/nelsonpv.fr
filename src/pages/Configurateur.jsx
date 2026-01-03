import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ControlPanel } from '../components/configurator/ui/ControlPanel.jsx';
import { useConfiguratorValues, useConfiguratorActions } from '@/stores/useConfiguratorStore.js';
import { useProjects } from '@/contexts/ProjectContext';
import { Download, Share2, Info, Search, Minimize2, ChevronRight, FileText, Maximize } from 'lucide-react';
import jsPDF from 'jspdf';
import BuildingScene from '../components/configurator/BuildingScene.jsx';
// Firebase Imports
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "@/config/firebase.js";
import { OfferGenerationModal } from '../components/configurator/ui/OfferGenerationModal.jsx';

export default function Configurateur() {
    const { user } = useAuth();
    const { projects } = useProjects();
    const config = useConfiguratorValues();
    const actions = useConfiguratorActions();

    // UI State
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [viewMode, setViewMode] = useState('3D'); // '3D', '2D_FRONT'
    const [isCapturing, setIsCapturing] = useState(false);
    const [generatedImages, setGeneratedImages] = useState({ img3D: null, mapImg: null });

    // Canvas Ref for screenshots
    const canvasRef = useRef();

    // Restriction admin
    if (!user || user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    // Filtrage projets
    const filteredProjects = useMemo(() => {
        if (!projectSearch) return [];
        const lower = projectSearch.toLowerCase();
        return projects.filter(p =>
            (p.name && p.name.toLowerCase().includes(lower)) ||
            (p.firstName && p.firstName.toLowerCase().includes(lower)) ||
            (p.city && p.city.toLowerCase().includes(lower))
        ).slice(0, 5);
    }, [projects, projectSearch]);

    // Helper: Wait function
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ... (inside component)

    // Helper: Fetch Image via Proxy (Shared logic with AppLayout)
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

    // Génération PDF Complète (OFFRE)
    const generateFullPDF = async () => {
        if (!canvasRef.current) return;

        setIsCapturing(true);
        const originalView = viewMode; // Save current view

        try {
            // 1. Capture 3D View (Perspective)
            setViewMode('3D');
            await wait(1000); // Allow render to settle
            const img3D = canvasRef.current.toDataURL('image/png', 1.0);

            // 2. Fetch Map Capture (Plan d'Implantation)
            let mapImg = null;
            if (selectedProject?.captures?.length > 0) {
                // Take the first capture as per request
                const captureUrl = selectedProject.captures[0];
                mapImg = await fetchImageViaProxy(captureUrl);
            }

            // 3. Generate PDF (Landscape)
            const pdf = new jsPDF('landscape', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
            const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm

            // --- LEFT COLUMN ---
            const leftMargin = 15;
            let y = 15;

            // Logo (Top Left)
            // Using public URL
            const logoUrl = "https://enr-courtage.fr/wp-content/uploads/2023/11/logo-enr-courtage-v3.png";
            try {
                const logoImg = new Image();
                logoImg.src = logoUrl;
                // Wait for load if needed, but addImage handles urls mostly if clean, 
                // but better handle async or use a base64 string if possible. 
                // For simplicity, we assume generic addImage works or we use the proxy if CORS issues.
                // Re-using proxy for Logo to be safe against CORS in PDF
                // Or try direct addImage
                pdf.addImage(logoUrl, 'PNG', leftMargin, y, 50, 0);
            } catch (e) {
                // Fallback text
                pdf.setFontSize(16);
                pdf.setTextColor(0, 0, 0);
                pdf.text("ENR COURTAGE", leftMargin, y + 10);
            }

            y += 25;

            // Client Info
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(12);
            pdf.setTextColor(0, 0, 0);

            if (selectedProject) {
                const name = `${selectedProject.name || ''} ${selectedProject.firstName || ''}`;
                pdf.text(name.toUpperCase(), leftMargin, y);
                y += 6;
                pdf.text(`${selectedProject.address || ''}`, leftMargin, y);
                y += 6;
                pdf.text(`${selectedProject.zip || ''} ${selectedProject.city || ''}`, leftMargin, y);
            } else {
                pdf.text('CLIENT: (Non renseigné)', leftMargin, y);
            }

            y += 20;

            // Prise en charge (List)
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 51, 153); // Dark Blue
            pdf.text('Prise en charge :', leftMargin, y);
            y += 8;

            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);
            const prises = [
                "Ensemble des démarches administratives",
                "Fondations",
                "Structure métallique du bâtiment",
                "Couverture Bac acier avec feutre anti-condensation",
                "Centrale Photovoltaïque (modules, câblages, onduleur...)",
                "Raccordement au réseau électrique"
            ];
            prises.forEach(item => {
                pdf.text(item, leftMargin, y);
                y += 6;
            });

            y += 10;

            // A votre charge (List)
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 51, 153);
            pdf.text('A votre charge :', leftMargin, y);
            y += 8;

            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);
            // Right align "A votre charge" text to the underline? Or just list.
            // User image has underline.
            // Let's add underline for headers.
            pdf.setDrawColor(255, 165, 0); // Orange
            pdf.setLineWidth(1);
            // Underline "Prise en charge" (retroactive visual fix, coordinate guess)
            // pdf.line(leftMargin, 75, leftMargin + 40, 75); 

            // Underline "A votre charge"
            pdf.line(leftMargin, y - 2, leftMargin + 35, y - 2);

            const charges = [
                "Terrassement",
                "Tranchée du bâtiment jusqu'au point de livraison (PDL)",
                "Équipement optionnels: chéneaux, bardage, portails, extincteurs..."
            ];
            // Wrap text if too long?
            charges.forEach(item => {
                const splitTitle = pdf.splitTextToSize(item, 100); // 100mm width max
                pdf.text(splitTitle, leftMargin, y);
                y += (6 * splitTitle.length);
            });

            // Website Footer (Left Column Bottom)
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 100);
            pdf.text('enr-courtage.fr', leftMargin, 190);

            // --- RIGHT COLUMN ---
            const rightMargin = 140; // Middle of page approx
            let ry = 15;

            // Header "NOTRE PROPOSITION"
            pdf.setFontSize(14);
            pdf.setTextColor(0, 0, 0); // Black
            pdf.setFont('helvetica', 'normal');
            pdf.text('NOTRE PROPOSITION', rightMargin + 40, ry, { align: 'center' }); // Centered in right col
            ry += 10;

            // Specs
            pdf.setFontSize(11);
            pdf.setTextColor(0, 0, 0);
            // Right align specs?
            // "30m x 18.6m Symétrique"
            // "Surface au sol : 558m²"
            // "Sablière : 5.5m"
            // "Faitage : 7.1m"
            // "Pente : 10° - Travées : 4 x 7.5m"

            const alignX = rightMargin + 40; // Center axis for text
            const buildingType = "Symétrique"; // Hardcoded or config.type ? config doesn't have type yet, default symetric

            // Calc Surface
            const getExtWidth = (side) => {
                if (side === 'appentis') return 9.3;
                if (side === 'auvent') return 4.0;
                return 0;
            };
            const totalWidth = config.width + getExtWidth(config.leftSide) + getExtWidth(config.rightSide);
            const surface = (totalWidth * config.length).toFixed(0);

            pdf.text(`${config.length}m x ${config.width}m ${buildingType}`, alignX, ry, { align: 'center' });
            ry += 6;
            pdf.text(`Surface au sol: ${surface} m²`, alignX, ry, { align: 'center' });
            ry += 6;
            pdf.text(`Sablière: ${config.eaveHeight} m`, alignX, ry, { align: 'center' });
            ry += 6;
            pdf.text(`Faitage: ${config.ridgeHeight} m`, alignX, ry, { align: 'center' });
            ry += 6;
            pdf.text(`Pente: ${config.roofPitch}° - Travées : ${config.bayCount} x ${config.baySpacing} m`, alignX, ry, { align: 'center' });

            ry += 10;

            // IMAGE 1: 3D Perspective
            // Dimensions: ~130mm wide
            if (img3D) {
                pdf.addImage(img3D, 'PNG', rightMargin, ry, 130, 70); // Aspect ratio to be checked
            }
            ry += 75;

            // Text "Des modifications mineures..."
            pdf.setFontSize(9);
            pdf.setTextColor(0, 51, 153);
            pdf.text('Des modifications mineures pourront être apportées', alignX, ry, { align: 'center' });
            ry += 10;

            // Header "PLAN D'IMPLANTATION"
            pdf.setFontSize(12);
            pdf.setTextColor(0, 0, 0);
            pdf.text("PLAN D'IMPLANTATION", rightMargin + 130, ry, { align: 'right' }); // Right aligned
            ry += 5;

            // IMAGE 2: Map Capture
            if (mapImg) {
                // Map Image
                pdf.addImage(mapImg, 'PNG', rightMargin, ry, 130, 80);
            } else {
                // Fallback or placeholder
                pdf.setDrawColor(200);
                pdf.rect(rightMargin, ry, 130, 80);
                pdf.text("Plan d'implantation non disponible", alignX, ry + 40, { align: 'center' });
            }
            ry += 85;

            // Date & Validity (Bottom Right)
            const date = new Date().toLocaleDateString('fr-FR');
            pdf.setFontSize(9);
            pdf.setTextColor(150);
            pdf.text(`${date} - Validité : 1 mois`, rightMargin + 130, 200, { align: 'right' });


            // Save
            const filename = `Offre_${selectedProject?.name || 'Projet'}.pdf`;
            pdf.save(filename);

        } catch (err) {
            console.error("PDF Generation error:", err);
            alert("Erreur lors de la génération du PDF: " + err.message);
        } finally {
            setIsCapturing(false);
            setViewMode(originalView);
            // Keep modal open or close? User usually wants to close.
            setShowPDFModal(false);
            setSelectedProject(null);
            setProjectSearch('');
        }
    };

    return (
        <div className="h-screen w-full bg-gradient-to-b from-slate-50 to-slate-200 relative flex overflow-hidden">

            {/* ========== CONTROL PANEL (LEFT) ========== */}
            <div className="absolute top-4 left-4 z-20 w-[420px] max-h-[calc(100vh-2rem)] overflow-y-auto">
                <ControlPanel />


            </div>

            {/* ========== VISUALISATION BÂTIMENT (CENTER) ========== */}
            <div id="3d-view-container" className="flex-1 ml-[440px] relative h-full isolate">
                {/* 3D Scene */}
                <div className="w-full h-full">
                    <BuildingScene
                        ref={canvasRef}
                        viewMode={viewMode}
                        isCapturing={isCapturing}
                    />
                </div>



                {/* INFO BADGE & DIMENSIONS TOGGLE (Top Left of Visualizer) */}
                <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 w-fit pointer-events-auto">
                    {/* Badge */}
                    <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow border border-slate-200">
                        <span className="text-slate-800 font-bold text-lg whitespace-nowrap">
                            {config.length}m x {parseFloat((config.width
                                + (config.leftSide === 'appentis' ? 9.3 : (config.leftSide === 'auvent' ? 4.0 : 0))
                                + (config.rightSide === 'appentis' ? 9.3 : (config.rightSide === 'auvent' ? 4.0 : 0))
                            ).toFixed(1))}m - {((config.width
                                + (config.leftSide === 'appentis' ? 9.3 : (config.leftSide === 'auvent' ? 4.0 : 0))
                                + (config.rightSide === 'appentis' ? 9.3 : (config.rightSide === 'auvent' ? 4.0 : 0))
                            ) * config.length).toFixed(0)}m²
                        </span>
                    </div>

                    {/* Solar PV Badge */}
                    {config.hasSolar && (
                        <div className="bg-yellow-50/90 backdrop-blur px-4 py-2 rounded-lg shadow border border-yellow-200">
                            <span className="text-yellow-800 font-bold text-lg whitespace-nowrap">
                                ⚡ {config.solarStats?.power?.toFixed(2)} kWc
                            </span>
                        </div>
                    )}

                    {/* Dimensions Toggle Button */}
                    <button
                        onClick={actions.toggleDimensions}
                        className={`w-full px-4 py-2 rounded-lg font-semibold text-sm shadow border transition-all flex items-center justify-between gap-3 ${config.showDimensions ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                    >
                        <span>Afficher les côtes</span>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${config.showDimensions ? 'bg-white/30' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${config.showDimensions ? 'left-6' : 'left-1'}`} />
                        </div>
                    </button>
                </div>

                {/* View Toggles & Actions (Top Right Overlay) */}
                <div className="absolute top-4 right-4 z-[100] flex flex-col gap-3 p-3 bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-slate-200 pointer-events-auto">

                    {/* View Modes */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('3D')}
                            className={`flex-1 px-4 py-2 rounded-xl font-medium params-transition text-sm ${viewMode === '3D' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            Vue 3D
                        </button>
                        <button
                            onClick={() => setViewMode('2D_FRONT')}
                            className={`flex-1 px-4 py-2 rounded-xl font-medium params-transition text-sm ${viewMode === '2D_FRONT' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            Vue 2D
                        </button>
                    </div>

                    {/* PDF Generation Button */}
                    <button
                        onClick={async () => {
                            // Capture 3D
                            let img3D = null;
                            if (canvasRef.current) {
                                const originalView = viewMode;
                                if (viewMode !== '2D_FRONT') {
                                    // Optionally force a specific view for the offer, but user might want 'current' view
                                    // Actually, let's just capture current view.
                                }
                                // Wait a bit if we switched view? No, we use current.
                                img3D = canvasRef.current.toDataURL('image/png', 1.0);
                            }

                            // Capture Map (Proxy)
                            let mapImg = null;
                            if (selectedProject?.captures?.length > 0) {
                                const captureUrl = selectedProject.captures[0];
                                mapImg = await fetchImageViaProxy(captureUrl);
                            }

                            setGeneratedImages({ img3D, mapImg });
                            setShowPDFModal(true);
                        }}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2 text-sm"
                    >
                        <span>📄</span>
                        <span>Générer l'Offre</span>
                    </button>

                    {/* Fullscreen Toggle (Integrated) */}
                    <button
                        onClick={() => {
                            const elem = document.getElementById('3d-view-container');
                            if (!document.fullscreenElement) {
                                elem?.requestFullscreen();
                            } else {
                                document.exitFullscreen();
                            }
                        }}
                        className="w-full bg-white text-slate-700 font-bold py-3 px-4 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm"
                        title="Plein écran"
                    >
                        <Maximize className="w-5 h-5" />
                        <span>Plein écran</span>
                    </button>
                </div>
            </div>

            {/* ========== MODAL OFFRE ========== */}
            <OfferGenerationModal
                isOpen={showPDFModal}
                onClose={() => setShowPDFModal(false)}
                config={config}
                selectedProject={selectedProject}
                generatedImages={generatedImages}
            />
        </div>
    );
}
