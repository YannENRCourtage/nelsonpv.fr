import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ControlPanel } from '../components/configurator/ui/ControlPanel.jsx';
import { useConfiguratorValues } from '../stores/useConfiguratorStore.js';
import jsPDF from 'jspdf';

export default function Configurateur() {
    const { user } = useAuth();
    const config = useConfiguratorValues();
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [projectInfo, setProjectInfo] = useState({
        clientName: '',
        address: '',
        zip: '',
        city: '',
        gps: '',
        phone: '',
        email: '',
        type: 'Hangar Agricole'
    });

    // Restriction admin
    if (!user || user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    // Génération PDF
    const generatePDF = () => {
        const pdf = new jsPDF('portrait', 'mm', 'a4');

        // HEADER
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('OFFRE DE DEVIS - BATIMENT METALLIQUE', 105, 15, { align: 'center' });

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');

        // Info Client
        let y = 30;
        pdf.text('Information Client:', 15, y);
        y += 7;
        pdf.text(`Nom: ${projectInfo.clientName}`, 20, y);
        y += 5;
        pdf.text(`Adresse: ${projectInfo.address}`, 20, y);
        y += 5;
        pdf.text(`Code Postal: ${projectInfo.zip} - Ville: ${projectInfo.city}`, 20, y);
        y += 5;
        pdf.text(`GPS: ${projectInfo.gps}`, 20, y);
        y += 5;
        pdf.text(`Téléphone: ${projectInfo.phone}`, 20, y);
        y += 5;
        pdf.text(`Email: ${projectInfo.email}`, 20, y);
        y += 5;
        pdf.text(`Type de projet: ${projectInfo.type}`, 20, y);

        // Caractéristiques Techniques
        y += 15;
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
        pdf.text(`Hauteur au faîtage: ${config.ridgeHeight}m (calculée)`, 20, y);
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

        // Placeholder pour vues 3D
        y += 15;
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.setFont('helvetica', 'italic');
        pdf.text('(Vues 3D à venir - Configurateur en cours de développement)', 105, y, { align: 'center' });

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

        pdf.save(`Offre_${projectInfo.clientName || 'Client'}.pdf`);
        setShowPDFModal(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 p-6">

            {/* LAYOUT GRID */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* CONTROL PANEL - LEFT */}
                <div className="lg:col-span-1">
                    <ControlPanel />

                    {/* BOUTON GÉNÉRATION OFFRE */}
                    <button
                        onClick={() => setShowPDFModal(true)}
                        className="mt-4 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    >
                        📄 Générer l'Offre PDF
                    </button>
                </div>

                {/* PREVIEW ZONE - RIGHT */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
                        <h2 className="text-3xl font-bold text-slate-900 mb-6">Résumé du Bâtiment</h2>

                        {/* SCHÉMA SIMPLE 2D */}
                        <div className="bg-slate-100 rounded-xl p-8 mb-6 border-2 border-dashed border-slate-300">
                            <svg viewBox="0 0 400 250" className="w-full h-auto">
                                {/* Représentation simple en vue de face */}
                                <rect x="50" y="150" width="300" height="80" fill="#888" stroke="#333" strokeWidth="2" />

                                {/* Toit */}
                                <polygon
                                    points={`50,150 200,${150 - (config.ridgeHeight - config.eaveHeight) * 15} 350,150`}
                                    fill="#666"
                                    stroke="#333"
                                    strokeWidth="2"
                                />

                                {/* Annotations */}
                                <text x="200" y="245" textAnchor="middle" fontSize="14" fill="#333" fontWeight="bold">
                                    {config.width}m
                                </text>
                                <text x="30" y="190" textAnchor="end" fontSize="12" fill="#555">
                                    {config.eaveHeight}m
                                </text>
                                <text x="200" y="90" textAnchor="middle" fontSize="12" fill="#555">
                                    {config.ridgeHeight}m (faîtage)
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
            </div>

            {/* MODAL PDF */}
            {showPDFModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
                        <h3 className="text-2xl font-bold text-slate-900 mb-6">Informations Client pour l'Offre</h3>

                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nom du client *"
                                value={projectInfo.clientName}
                                onChange={(e) => setProjectInfo({ ...projectInfo, clientName: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />

                            <input
                                type="text"
                                placeholder="Adresse"
                                value={projectInfo.address}
                                onChange={(e) => setProjectInfo({ ...projectInfo, address: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Code Postal"
                                    value={projectInfo.zip}
                                    onChange={(e) => setProjectInfo({ ...projectInfo, zip: e.target.value })}
                                    className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <input
                                    type="text"
                                    placeholder="Ville"
                                    value={projectInfo.city}
                                    onChange={(e) => setProjectInfo({ ...projectInfo, city: e.target.value })}
                                    className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <input
                                type="text"
                                placeholder="Coordonnées GPS"
                                value={projectInfo.gps}
                                onChange={(e) => setProjectInfo({ ...projectInfo, gps: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />

                            <input
                                type="tel"
                                placeholder="Téléphone"
                                value={projectInfo.phone}
                                onChange={(e) => setProjectInfo({ ...projectInfo, phone: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />

                            <input
                                type="email"
                                placeholder="Email"
                                value={projectInfo.email}
                                onChange={(e) => setProjectInfo({ ...projectInfo, email: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />

                            <select
                                value={projectInfo.type}
                                onChange={(e) => setProjectInfo({ ...projectInfo, type: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="Hangar Agricole">Hangar Agricole</option>
                                <option value="Bâtiment Industriel">Bâtiment Industriel</option>
                                <option value="Stockage">Stockage</option>
                                <option value="Autre">Autre</option>
                            </select>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setShowPDFModal(false)}
                                className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={generatePDF}
                                disabled={!projectInfo.clientName}
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
