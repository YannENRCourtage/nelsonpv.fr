import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { apiService } from '@/services/api';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Download, FileText, Zap, ChevronRight, User, Search, X, Battery, Cable } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import html2canvas from 'html2canvas';
import {
    PlateCover,
    PlateSituation,
    PlateMasse,
    PlateSection,
    PlateFacades,
    PlateInsertionNotice,
    PlateEnvProche,
} from '@/components/editor/DPPlates';
import RaccordementBatterie from '@/components/developpement/RaccordementBatterie';

const TABS = [
    { id: 'dp-batterie', label: 'DP Batterie', icon: Battery },
    { id: 'raccordement', label: 'Raccordement Batterie', icon: Cable },
];

// ─── Styles communs ──────────────────────────────────────────────────────────
const sidebarW = '260px';

export default function Developpement() {
    const { user, activeTenantId } = useAuth();
    const [activeTab, setActiveTab] = useState('dp-batterie');

    // ── Projets / Clients
    const [projects, setProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);

    // ── DP Generation
    const [isGenerating, setIsGenerating] = useState(false);
    const [captureStep, setCaptureStep] = useState('');

    // Charger la liste des projets
    useEffect(() => {
        const loadProjects = async () => {
            try {
                setLoadingProjects(true);
                const data = await apiService.getProjects(activeTenantId);
                setProjects(data || []);
            } catch (e) {
                console.error('Erreur chargement projets', e);
            } finally {
                setLoadingProjects(false);
            }
        };
        loadProjects();
    }, [activeTenantId]);

    // Filtrage projets
    const filteredProjects = projects.filter((p) => {
        const q = search.toLowerCase();
        const name = `${p.firstName || ''} ${p.name || ''} ${p.city || ''}`.toLowerCase();
        return name.includes(q);
    });

    // ─── Génération du PDF DP complet ─────────────────────────────────────────
    const handleGenerateDP = async () => {
        if (!selectedProject) {
            toast({ title: 'Sélectionnez un client', variant: 'destructive' });
            return;
        }
        setIsGenerating(true);
        setCaptureStep('Préparation des planches…');

        try {
            const wait = (ms) => new Promise((r) => setTimeout(r, ms));

            // IDs des planches à capturer (dans l'ordre du dossier)
            const plateIds = [
                'dev-plate-cover',
                'dev-plate-situation',
                'dev-plate-masse',   // DP2 — toujours fixe
                'dev-plate-section',
                'dev-plate-facades', // DP4 — toujours fixe
                'dev-plate-env-proche',
                'dev-plate-notice',
            ];

            const { PDFDocument } = await import('pdf-lib');
            const finalDoc = await PDFDocument.create();

            for (const id of plateIds) {
                setCaptureStep(`Capture ${id}…`);
                const el = document.getElementById(id);
                if (!el) continue;
                await wait(150);
                const canvas = await html2canvas(el, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                });
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

                try {
                    const plateImg = await finalDoc.embedJpg(dataUrl);
                    const page = finalDoc.addPage([841.89, 595.28]); // A4 Paysage
                    page.drawImage(plateImg, { x: 0, y: 0, width: 841.89, height: 595.28 });
                } catch (e) {
                    console.error(`Erreur planche ${id}`, e);
                }
            }

            setCaptureStep('Assemblage PDF…');
            const pdfBytes = await finalDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const clientName = `${selectedProject.firstName || ''} ${selectedProject.name || ''}`.trim();
            link.download = `DP_Batterie_${clientName || 'Projet'}.pdf`;
            link.click();

            toast({ title: 'Dossier DP généré', description: 'Le PDF a été téléchargé avec succès.' });
        } catch (err) {
            console.error('DP generation error', err);
            toast({ title: 'Erreur', description: 'Impossible de générer le dossier.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
            setCaptureStep('');
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', background: '#f0f4f8' }}>
            {/* ── Sidebar Latérale ─────────────────────────────────────────── */}
            <aside style={{
                width: sidebarW,
                minWidth: sidebarW,
                background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
                display: 'flex',
                flexDirection: 'column',
                padding: '24px 0',
                boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
                zIndex: 10,
                position: 'sticky',
                top: 0,
                height: 'calc(100vh - 64px)',
                overflowY: 'auto',
            }}>
                <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 10, padding: 8 }}>
                            <Zap size={18} color="white" />
                        </div>
                        <span style={{ color: 'white', fontWeight: 800, fontSize: 15, letterSpacing: 0.5 }}>Développement</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 38 }}>Dossiers & Raccordements</p>
                </div>

                {/* Onglets */}
                <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '12px 16px',
                                    borderRadius: 12,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: isActive
                                        ? 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.15))'
                                        : 'transparent',
                                    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                                    color: isActive ? '#93c5fd' : 'rgba(255,255,255,0.5)',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: 13,
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    width: '100%',
                                }}
                            >
                                <Icon size={18} />
                                <span style={{ flex: 1 }}>{tab.label}</span>
                                {isActive && <ChevronRight size={14} />}
                            </button>
                        );
                    })}
                </nav>

                {/* Info utilisateur */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={14} color="#93c5fd" />
                        </div>
                        <div>
                            <div style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>{user?.firstName || 'Utilisateur'}</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{user?.role || ''}</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── Contenu Principal ─────────────────────────────────────────── */}
            <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {activeTab === 'dp-batterie' && (
                    <DPBatterieTab
                        projects={filteredProjects}
                        loadingProjects={loadingProjects}
                        search={search}
                        setSearch={setSearch}
                        selectedProject={selectedProject}
                        setSelectedProject={setSelectedProject}
                        isGenerating={isGenerating}
                        captureStep={captureStep}
                        onGenerateDP={handleGenerateDP}
                    />
                )}
                {activeTab === 'raccordement' && (
                    <RaccordementBatterie
                        projects={filteredProjects}
                        selectedProject={selectedProject}
                        setSelectedProject={setSelectedProject}
                    />
                )}
            </main>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Onglet DP Batterie
// ═══════════════════════════════════════════════════════════════════════════════
function DPBatterieTab({
    projects, loadingProjects, search, setSearch,
    selectedProject, setSelectedProject,
    isGenerating, captureStep, onGenerateDP,
}) {
    const [showClientPanel, setShowClientPanel] = useState(true);

    return (
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* ── Panneau Sélection Client ──────────────────────────────── */}
            {showClientPanel && (
                <div style={{
                    width: 300,
                    minWidth: 300,
                    background: 'white',
                    borderRight: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    height: 'calc(100vh - 64px)',
                    position: 'sticky',
                    top: 0,
                    overflowY: 'auto',
                }}>
                    <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', margin: '0 0 12px' }}>
                            <User size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} />
                            Sélectionner un client
                        </h3>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Rechercher..."
                                style={{
                                    width: '100%', border: '1px solid #e2e8f0', borderRadius: 10,
                                    padding: '8px 10px 8px 32px', fontSize: 13, outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
                        {loadingProjects ? (
                            <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} />
                                <div style={{ fontSize: 12, marginTop: 8 }}>Chargement...</div>
                            </div>
                        ) : projects.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 12 }}>
                                Aucun projet trouvé
                            </div>
                        ) : (
                            projects.map((p) => {
                                const isSelected = selectedProject?.id === p.id;
                                const clientName = `${p.firstName || ''} ${p.name || ''}`.trim();
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedProject(p)}
                                        style={{
                                            display: 'block', width: '100%', textAlign: 'left',
                                            padding: '10px 12px', borderRadius: 10, border: 'none',
                                            cursor: 'pointer', marginBottom: 4,
                                            background: isSelected ? '#eff6ff' : 'transparent',
                                            borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? '#1d4ed8' : '#1e293b' }}>
                                            {clientName || 'Client sans nom'}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                            {p.city || '—'} {p.zip ? `(${p.zip})` : ''}
                                        </div>
                                        {p.battery_model && (
                                            <div style={{ fontSize: 10, color: '#93c5fd', marginTop: 2, fontWeight: 600 }}>
                                                🔋 {p.battery_model}
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ── Zone principale DP ────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'white', borderRadius: 16, padding: '16px 24px',
                    boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 24,
                }}>
                    <div>
                        <h2 style={{ fontWeight: 900, fontSize: 20, color: '#0f172a', margin: 0 }}>
                            Dossier de Déclaration Préalable — Batterie
                        </h2>
                        {selectedProject ? (
                            <p style={{ fontSize: 13, color: '#3b82f6', margin: '4px 0 0', fontWeight: 600 }}>
                                Client : {`${selectedProject.firstName || ''} ${selectedProject.name || ''}`.trim()} — {selectedProject.city}
                            </p>
                        ) : (
                            <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
                                Sélectionnez un client dans le panneau gauche
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onGenerateDP}
                        disabled={isGenerating || !selectedProject}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '12px 24px', borderRadius: 12, border: 'none',
                            background: isGenerating || !selectedProject
                                ? '#e2e8f0'
                                : 'linear-gradient(135deg, #2563eb, #7c3aed)',
                            color: isGenerating || !selectedProject ? '#94a3b8' : 'white',
                            fontWeight: 700, fontSize: 14, cursor: isGenerating || !selectedProject ? 'not-allowed' : 'pointer',
                            boxShadow: isGenerating || !selectedProject ? 'none' : '0 4px 16px rgba(37,99,235,0.3)',
                            transition: 'all 0.2s',
                        }}
                    >
                        {isGenerating ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={18} />}
                        {isGenerating ? (captureStep || 'Génération…') : 'Télécharger le Dossier DP'}
                    </button>
                </div>

                {!selectedProject ? (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: 80, background: 'white', borderRadius: 20, border: '2px dashed #e2e8f0',
                    }}>
                        <FileText size={48} color="#cbd5e1" />
                        <h3 style={{ color: '#94a3b8', marginTop: 16, fontWeight: 700 }}>Aucun client sélectionné</h3>
                        <p style={{ color: '#94a3b8', fontSize: 13 }}>
                            Choisissez un client dans le panneau de gauche pour visualiser et générer son dossier DP.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        <DPPlatePreview id="dev-plate-cover" label="Page de garde">
                            <PlateCover project={selectedProject} />
                        </DPPlatePreview>

                        <DPPlatePreview id="dev-plate-situation" label="DP1 — Plan de situation" clientLinked>
                            <PlateSituation project={selectedProject} captures={selectedProject.urbanisme_captures || {}} />
                        </DPPlatePreview>

                        <DPPlatePreview id="dev-plate-masse" label="DP2 — Plan de masse" fixed>
                            <PlateMasse project={selectedProject} captures={selectedProject.urbanisme_captures || {}} />
                        </DPPlatePreview>

                        <DPPlatePreview id="dev-plate-section" label="DP3 — Plan en coupe" fixed>
                            <PlateSection project={selectedProject} />
                        </DPPlatePreview>

                        <DPPlatePreview id="dev-plate-facades" label="DP4 — Façades et toitures" fixed>
                            <PlateFacades project={selectedProject} batteryPhoto="https://nelsonpv.fr/mercury_product_photo.jpg" />
                        </DPPlatePreview>

                        <DPPlatePreview id="dev-plate-env-proche" label="DP7 — Vue aérienne satellite" clientLinked>
                            <PlateEnvProche project={selectedProject} captures={selectedProject.urbanisme_captures || {}} />
                        </DPPlatePreview>

                        <DPPlatePreview id="dev-plate-notice" label="DP8.1 — Notice d'insertion" clientLinked>
                            <PlateInsertionNotice project={selectedProject} />
                        </DPPlatePreview>
                    </div>
                )}
            </div>

            {/* Hidden render zone for html2canvas */}
            {selectedProject && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}>
                    <div id="dev-plate-cover"><PlateCover project={selectedProject} /></div>
                    <div id="dev-plate-situation"><PlateSituation project={selectedProject} captures={selectedProject.urbanisme_captures || {}} /></div>
                    <div id="dev-plate-masse"><PlateMasse project={selectedProject} captures={selectedProject.urbanisme_captures || {}} /></div>
                    <div id="dev-plate-section"><PlateSection project={selectedProject} /></div>
                    <div id="dev-plate-facades"><PlateFacades project={selectedProject} batteryPhoto="https://nelsonpv.fr/mercury_product_photo.jpg" /></div>
                    <div id="dev-plate-env-proche"><PlateEnvProche project={selectedProject} captures={selectedProject.urbanisme_captures || {}} /></div>
                    <div id="dev-plate-notice"><PlateInsertionNotice project={selectedProject} /></div>
                </div>
            )}
        </div>
    );
}

// ─── Composant de prévisualisation d'une planche ─────────────────────────────
function DPPlatePreview({ id, label, children, fixed, clientLinked }) {
    return (
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {/* Header de la planche */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px', borderBottom: '1px solid #f1f5f9',
                background: fixed ? '#fefce8' : clientLinked ? '#eff6ff' : '#f8fafc',
            }}>
                <FileText size={16} color={fixed ? '#ca8a04' : clientLinked ? '#2563eb' : '#64748b'} />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{label}</span>
                {fixed && (
                    <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: '#fef08a', color: '#854d0e',
                    }}>FIXE</span>
                )}
                {clientLinked && (
                    <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: '#dbeafe', color: '#1d4ed8',
                    }}>Lié au client</span>
                )}
            </div>

            {/* Aperçu A4 paysage */}
            <div style={{
                padding: '20px', background: '#f8fafc',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
            }}>
                <div style={{
                    width: '100%', maxWidth: 900,
                    aspectRatio: '297/210',
                    background: 'white',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    position: 'relative',
                }}>
                    {/* Rendu mis à l'échelle */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0,
                        width: '297mm', height: '210mm',
                        transformOrigin: 'top left',
                        transform: 'scale(var(--dp-scale, 1))',
                    }} className="dp-plate-scaler">
                        {children}
                    </div>
                </div>
            </div>
            <style>{`
                .dp-plate-scaler {
                    --dp-scale: calc(100% / 297mm);
                }
                @media (min-width: 900px) {
                    .dp-plate-scaler {
                        --dp-scale: calc(860px / (297 * 3.7795));
                    }
                }
            `}</style>
        </div>
    );
}
