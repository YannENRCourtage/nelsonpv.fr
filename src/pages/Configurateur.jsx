import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ControlPanel } from '../components/configurator/ui/ControlPanel.jsx';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';
import { useProjects } from '@/contexts/ProjectContext';
import { Search, Monitor, icons } from 'lucide-react';
import jsPDF from 'jspdf';
import BuildingScene from '../components/configurator/BuildingScene.jsx';

export default function Configurateur() {
    const { user } = useAuth();
    const { projects } = useProjects();
    const config = useConfiguratorValues();

    // UI State
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [viewMode, setViewMode] = useState('3D'); // '3D', '2D_FRONT'
    const [isCapturing, setIsCapturing] = useState(false);

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

    // Génération PDF Complète
    const generateFullPDF = async () => {
        if (!canvasRef.current) return;

        setIsCapturing(true); // Optimization flag for Scene (white bg etc)
        const originalView = viewMode;

        try {
            // 1. Capture View 1 (3D / Iso)
            setViewMode('3D');
            // Give time for renderer to settle/center
            await wait(800);
            // Force a render or just grab data? R3F loop usually renders.
            const img3D = canvasRef.current.toDataURL('image/png', 1.0);

            // 2. Capture View 2 (2D Front)
            setViewMode('2D_FRONT');
            await wait(800);
            const img2D = canvasRef.current.toDataURL('image/png', 1.0);

            // 3. Generate PDF
            const pdf = new jsPDF('portrait', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // HEADER
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('OFFRE DE DEVIS - BATIMENT METALLIQUE', pageWidth / 2, 15, { align: 'center' });

            // Client Info
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            let y = 30;
            if (selectedProject) {
                pdf.text('CLIENT:', 15, y);
                pdf.text(`${selectedProject.name || ''} ${selectedProject.firstName || ''}`, 15, y + 5);
                pdf.text(`${selectedProject.address || ''}`, 15, y + 10);
                pdf.text(`${selectedProject.zip || ''} ${selectedProject.city || ''}`, 15, y + 15);
            } else {
                pdf.text('CLIENT: (Non renseigné)', 15, y);
            }

            // Specs Summary (Right side)
            const rightX = 120;
            pdf.text('CARACTERISTIQUES:', rightX, y);
            pdf.text(`Dimensions: ${config.width}m x ${config.length}m`, rightX, y + 5);
            pdf.text(`Hauteurs: ${config.eaveHeight}m (Sablière) / ${config.ridgeHeight}m (Faîtage)`, rightX, y + 10);
            pdf.text(`Pente: ${config.roofPitch}° - Travées: ${config.bayCount} x ${config.baySpacing}m`, rightX, y + 15);

            y += 25;

            // Image 1 (3D)
            const imgHeight = 90;
            pdf.addImage(img3D, 'PNG', 10, y, pageWidth - 20, imgHeight);
            pdf.setFontSize(9);
            pdf.text('Vue 3D Perspective', pageWidth / 2, y + imgHeight + 5, { align: 'center' });

            y += imgHeight + 15;

            // Image 2 (2D)
            pdf.addImage(img2D, 'PNG', 10, y, pageWidth - 20, imgHeight);
            pdf.text('Vue Technique (Façade)', pageWidth / 2, y + imgHeight + 5, { align: 'center' });

            // FOOTER
            pdf.setFontSize(9);
            pdf.setTextColor(80, 80, 80);
            pdf.text(
                'Offre valable un mois à compter de ce jour - Des modifications mineures pourront être apportées',
                pageWidth / 2, 280, { align: 'center' }
            );
            pdf.setFont('helvetica', 'bold');
            pdf.text('ENR COURTAGE - 2025', pageWidth / 2, 287, { align: 'center' });

            pdf.save(`Offre_${selectedProject?.name || 'Projet'}.pdf`);

        } catch (err) {
            console.error("PDF Generation error:", err);
            alert("Erreur lors de la génération du PDF");
        } finally {
            // Restore state
            setIsCapturing(false);
            setViewMode(originalView);
            setShowPDFModal(false);
            setSelectedProject(null);
            setProjectSearch('');
        }
    };

    return (
        <div className="h-screen w-full bg-gradient-to-b from-slate-50 to-slate-200 relative flex overflow-hidden">

            {/* ========== CONTROL PANEL (LEFT) ========== */}
            <div className="absolute top-4 left-4 z-20 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
                <ControlPanel />

                {/* BOUTON GÉNÉRATION OFFRE */}
                <button
                    onClick={() => setShowPDFModal(true)}
                    className="mt-4 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                    📄 Générer l'Offre PDF
                </button>
            </div>

            {/* ========== VISUALISATION BÂTIMENT (CENTER) ========== */}
            <div className="flex-1 ml-[340px] relative h-full">
                {/* 3D Scene */}
                <div className="w-full h-full">
                    <BuildingScene
                        ref={canvasRef}
                        viewMode={viewMode}
                        isCapturing={isCapturing}
                    />
                </div>

                {/* View Toggles (Top Right Overlay) */}
                <div className="absolute top-4 right-4 z-20 flex gap-2 bg-white/90 backdrop-blur p-2 rounded-lg shadow border border-slate-200">
                    <button
                        onClick={() => setViewMode('3D')}
                        className={`px-4 py-2 rounded-md font-medium transition ${viewMode === '3D' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        Vue 3D
                    </button>
                    <button
                        onClick={() => setViewMode('2D_FRONT')}
                        className={`px-4 py-2 rounded-md font-medium transition ${viewMode === '2D_FRONT' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        Vue 2D
                    </button>
                </div>
            </div>

            {/* ========== MODAL PDF ========== */}
            {showPDFModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
                        <h3 className="text-2xl font-bold text-slate-900 mb-6">Sélection Projet pour l'Offre</h3>

                        {!selectedProject ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher un projet (nom, prénom, ville)..."
                                        value={projectSearch}
                                        onChange={(e) => setProjectSearch(e.target.value)}
                                        className="w-full pl-10 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {projectSearch && filteredProjects.length > 0 && (
                                    <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
                                        {filteredProjects.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => { setSelectedProject(p); setProjectSearch(''); }}
                                                className="p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                            >
                                                <div className="font-semibold text-slate-800">{p.name} {p.firstName}</div>
                                                <div className="text-sm text-slate-500">{p.city} ({p.zip})</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {projectSearch && filteredProjects.length === 0 && (
                                    <div className="text-center py-8 text-slate-500">
                                        <p className="text-sm">Aucun projet trouvé</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="font-bold text-green-900">{selectedProject.name} {selectedProject.firstName}</div>
                                    <div className="text-sm text-green-700">{selectedProject.address}</div>
                                    <div className="text-sm text-green-700">{selectedProject.zip} {selectedProject.city}</div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => { setShowPDFModal(false); setSelectedProject(null); setProjectSearch(''); }}
                                className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={generateFullPDF}
                                disabled={!selectedProject || isCapturing}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCapturing ? 'Génération en cours...' : 'Générer le PDF'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
