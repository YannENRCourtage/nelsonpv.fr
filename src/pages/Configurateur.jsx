import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ControlPanel } from '../components/configurator/ui/ControlPanel.jsx';
import { useConfiguratorValues } from '@/stores/useConfiguratorStore.js';
import { useProjects } from '@/contexts/ProjectContext';
import { Search } from 'lucide-react';
import jsPDF from 'jspdf';

export default function Configurateur() {
    const { user } = useAuth();
    const { projects } = useProjects();
    const config = useConfiguratorValues();
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);

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

    // Génération PDF
    const generatePDF = () => {
        const pdf = new jsPDF('portrait', 'mm', 'a4');

        // HEADER
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('OFFRE DE DEVIS - BATIMENT METALLIQUE', 105, 15, { align: 'center' });

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');

        // Info Client (depuis projet sélectionné)
        let y = 30;
        if (selectedProject) {
            pdf.text('Information Client:', 15, y);
            y += 7;
            pdf.text(`Nom: ${selectedProject.name} ${selectedProject.firstName || ''}`, 20, y);
            y += 5;
            pdf.text(`Adresse: ${selectedProject.address || ''}`, 20, y);
            y += 5;
            pdf.text(`Code Postal: ${selectedProject.zip || ''} - Ville: ${selectedProject.city || ''}`, 20, y);
            y += 5;
            pdf.text(`Téléphone: ${selectedProject.phone || ''}`, 20, y);
            y += 5;
            pdf.text(`Email: ${selectedProject.email || ''}`, 20, y);
            y += 10;
        }

        // Caractéristiques Techniques
        pdf.setFont('helvetica', 'bold');
        pdf.text('Caractéristiques Techniques:', 15, y);
        pdf.setFont('helvetica', 'normal');

        y += 10;
        pdf.text(`Largeur du bâtiment: ${config.width}m`, 20, y);
        y += 5;
        pdf.text(`Longueur du bâtiment: ${config.length}m`, 20, y);
        y += 5;
        pdf.text(`Hauteur sous égout: ${config.eaveHeight}m (fixe)`, 20, y);
        y += 5;
        pdf.text(`Hauteur au faîtage: ${config.ridgeHeight}m`, 20, y);
        y += 5;
        pdf.text(`Pente de toiture: ${config.roofPitch}° (fixe)`, 20, y);
        y += 5;
        pdf.text(`Nombre de travées: ${config.bayCount}`, 20, y);
        y += 5;
        pdf.text(`Espacement des travées: ${config.baySpacing}m`, 20, y);

        // Surface
        y += 10;
        const surface = config.width * config.length;
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Surface totale: ${surface.toFixed(2)}m²`, 20, y);

        // FOOTER
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
            'Offre valable un mois à compter de ce jour - Des modifications mineures pourront être apportées',
            105, 280, { align: 'center' }
        );
        pdf.setFont('helvetica', 'bold');
        pdf.text('ENR COURTAGE - 2025', 105, 287, { align: 'center' });

        pdf.save(`Offre_${selectedProject?.name || 'Client'}.pdf`);
        setShowPDFModal(false);
        setSelectedProject(null);
        setProjectSearch('');
    };

    // Largeur dynamique du SVG basée sur la largeur du bâtiment
    const svgWidth = Math.max(400, config.width * 15);

    return (
        <div className="h-screen w-full bg-gradient-to-b from-slate-50 to-slate-200 relative flex overflow-hidden">

            {/* ========== CONTROL PANEL (LEFT) ========== */}
            <div className="absolute top-4 left-4 z-10 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
                <ControlPanel />

                {/* BOUTON GÉNÉRATION OFFRE */}
                <button
                    onClick={() => setShowPDFModal(true)}
                    className="mt-4 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                    📄 Générer l'Offre PDF
                </button>
            </div>

            {/* ========== VISUALISATION BÂTIMENT (CENTER-RIGHT) ========== */}
            <div className="flex-1 ml-[340px] p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200 h-full flex flex-col">
                    <h2 className="text-3xl font-bold text-slate-900 mb-6">Résumé du Bâtiment</h2>

                    {/* SCHÉMA 2D AGRANDI - SANS MURS */}
                    <div className="bg-slate-100 rounded-xl p-8 mb-6 border-2 border-dashed border-slate-300 flex-1">
                        <svg viewBox={`0 0 ${svgWidth} 250`} className="w-full h-auto">
                            {/* Représentation simple en vue de face - SANS MURS */}

                            {/* Toit seulement */}
                            <polygon
                                points={`${config.width * 2.5},150 ${config.width * 7.5},${150 - (config.ridgeHeight - config.eaveHeight) * 15} ${config.width * 12.5},150`}
                                fill="#666"
                                stroke="#333"
                                strokeWidth="2"
                            />

                            {/* Structure (poteaux représentés par des lignes verticales) */}
                            <line x1={`${config.width * 2.5}`} y1="150" x2={`${config.width * 2.5}`} y2="230" stroke="#e63946" strokeWidth="4" />
                            <line x1={`${config.width * 12.5}`} y1="150" x2={`${config.width * 12.5}`} y2="230" stroke="#e63946" strokeWidth="4" />

                            {/* Sol */}
                            <line x1={`${config.width * 2}`} y1="230" x2={`${config.width * 13}`} y2="230" stroke="#333" strokeWidth="2" />

                            {/* Annotations */}
                            <text x={`${config.width * 7.5}`} y="245" textAnchor="middle" fontSize="14" fill="#333" fontWeight="bold">
                                {config.width}m
                            </text>
                            <text x={`${config.width * 1.5}`} y="190" textAnchor="end" fontSize="12" fill="#555">
                                {config.eaveHeight}m
                            </text>
                            <text x={`${config.width * 7.5}`} y={`${150 - (config.ridgeHeight - config.eaveHeight) * 15 - 10}`} textAnchor="middle" fontSize="12" fill="#555">
                                {config.ridgeHeight}m
                            </text>
                        </svg>

                        <p className="text-center text-sm text-slate-500 mt-4">
                            Vue de face simplifiée (Vue 3D à venir)
                        </p>
                    </div>

                    {/* SPÉCIFICATIONS */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Dimensions</p>
                            <p className="text-2xl font-bold text-blue-900">{config.width}m × {config.length}m</p>
                            <p className="text-xs text-blue-700 mt-1">Surface: {(config.width * config.length).toFixed(2)}m²</p>
                        </div>



                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">Hauteurs</p>
                            <p className="text-lg font-bold text-green-900">Égout: {config.eaveHeight}m</p>
                            <p className="text-lg font-bold text-green-900">Faîtage: {config.ridgeHeight}m</p>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <p className="text-xs text-orange-600 font-medium uppercase tracking-wide mb-1">Structure</p>
                            <p className="text-lg font-bold text-orange-900">{config.bayCount} travées</p>
                            <p className="text-xs text-orange-700 mt-1">Espacement: {config.baySpacing}m</p>
                        </div>

                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <p className="text-xs text-purple-600 font-medium uppercase tracking-wide mb-1">Toiture</p>
                            <p className="text-lg font-bold text-purple-900">Pente: {config.roofPitch}°</p>
                            <p className="text-xs text-purple-700 mt-1">Bac acier</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== INFO BADGE (TOP RIGHT) ========== */}
            <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg border border-slate-200">
                <p className="text-xs text-slate-600 font-medium">
                    <span className="text-blue-600 font-bold">{config.width}m</span> × <span className="text-green-600 font-bold">{config.length}m</span>
                </p>
            </div>

            {/* ========== MODAL PDF ========== */}
            {showPDFModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
                        <h3 className="text-2xl font-bold text-slate-900 mb-6">Sélection Projet pour l'Offre</h3>

                        {!selectedProject ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute lef left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
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
                                onClick={generatePDF}
                                disabled={!selectedProject}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Générer le PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
