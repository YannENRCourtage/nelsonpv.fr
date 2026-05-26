import React, { useState, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Download, FileText, Image as ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import html2canvas from 'html2canvas';

import {
    PlateCover,
    PlateSituation,
    PlateMasse,
    PlateSection,
    PlateFacades,
    PlateNotice,
    PlateInsertion,
    PlateEnvProcheLointain
} from '@/components/editor/PCPlates';

export default function PCBatimentTab({
    projects,
    loadingProjects,
    selectedProject,
    setSelectedProject,
}) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [captureStep, setCaptureStep] = useState('');
    
    // User inputs for PC
    const [noticeText, setNoticeText] = useState(selectedProject?.noticeAgricole || '');
    const [pcPhotos, setPcPhotos] = useState({
        avant: null,
        apres: null,
        proche: null,
        lointain: null,
    });

    // Sync state when project changes
    React.useEffect(() => {
        if (selectedProject) {
            setNoticeText(selectedProject.noticeAgricole || '');
            setPcPhotos(selectedProject.pcPhotos || { avant: null, apres: null, proche: null, lointain: null });
        }
    }, [selectedProject]);

    const handlePhotoUpload = (key, e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const newPhotos = { ...pcPhotos, [key]: event.target.result };
                setPcPhotos(newPhotos);
                if (selectedProject) {
                    selectedProject.pcPhotos = newPhotos;
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNoticeChange = (e) => {
        setNoticeText(e.target.value);
        if (selectedProject) {
            selectedProject.noticeAgricole = e.target.value;
        }
    };

    const handleGeneratePC = async () => {
        if (!selectedProject) {
            toast({ title: 'Sélectionnez un client', variant: 'destructive' });
            return;
        }
        setIsGenerating(true);
        setCaptureStep('Préparation des planches…');

        try {
            const wait = (ms) => new Promise((r) => setTimeout(r, ms));

            const plateIds = [
                'pc-plate-cover',
                'pc-plate-situation',
                'pc-plate-masse',
                'pc-plate-section',
                'pc-plate-notice',
                'pc-plate-facades',
                'pc-plate-insertion',
                'pc-plate-env'
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

            // Add CERFA Permis de Construire (cerfa_13406.pdf placeholder if doesn't exist, we fallback to cerfa_13404)
            setCaptureStep('Ajout des pages CERFA…');
            try {
                // Try cerfa_13406.pdf if available, otherwise 13404.pdf (DP) as fallback, as we don't have it locally.
                const cerfaUrl = '/templates/cerfa_13404.pdf'; 
                const res = await fetch(cerfaUrl);
                if (res.ok) {
                    const cerfaArrayBuffer = await res.arrayBuffer();
                    const cerfaDoc = await PDFDocument.load(cerfaArrayBuffer);
                    const copiedPages = await finalDoc.copyPages(cerfaDoc, cerfaDoc.getPageIndices());
                    copiedPages.forEach((page) => {
                        finalDoc.addPage(page);
                    });
                }
            } catch (err) {
                console.error("Erreur lors de l'ajout du CERFA:", err);
            }

            setCaptureStep('Assemblage PDF…');
            const pdfBytes = await finalDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const clientName = `${selectedProject.firstName || ''} ${selectedProject.name || ''}`.trim();
            link.download = `PC_Batiment_${clientName || 'Projet'}.pdf`;
            link.click();

            toast({ title: 'Dossier PC généré', description: 'Le PDF a été téléchargé avec succès.' });
        } catch (err) {
            console.error('PC generation error', err);
            toast({ title: 'Erreur', description: 'Impossible de générer le dossier.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
            setCaptureStep('');
        }
    };

    return (
        <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                <div style={{
                    position: 'sticky', top: 0, zIndex: 50,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'white', borderRadius: 16, padding: '20px 28px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)', marginBottom: 24,
                }}>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontWeight: 900, fontSize: 20, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            Dossier de Permis de Construire — Bâtiment PV
                        </h2>
                        <div style={{ marginTop: 16 }}>
                            <select
                                value={selectedProject?.id || ''}
                                onChange={(e) => {
                                    const proj = projects.find(p => p.id === e.target.value);
                                    setSelectedProject(proj || null);
                                }}
                                style={{
                                    width: '100%', maxWidth: 450, padding: '12px 16px', borderRadius: 10,
                                    border: '1px solid #cbd5e1', fontSize: 14, outline: 'none',
                                    backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: 600,
                                    cursor: 'pointer', appearance: 'auto'
                                }}
                            >
                                <option value="">-- Sélectionnez un projet / client --</option>
                                {projects.map((p) => {
                                    const clientName = `${p.firstName || ''} ${p.name || ''}`.trim() || 'Client sans nom';
                                    const loc = p.city ? ` — ${p.city}` : '';
                                    return (
                                        <option key={p.id} value={p.id}>
                                            {clientName}{loc}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={handleGeneratePC}
                        disabled={isGenerating || !selectedProject}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '14px 28px', borderRadius: 12, border: 'none',
                            background: isGenerating || !selectedProject
                                ? '#e2e8f0'
                                : 'linear-gradient(135deg, #10b981, #059669)',
                            color: isGenerating || !selectedProject ? '#94a3b8' : 'white',
                            fontWeight: 700, fontSize: 14, cursor: isGenerating || !selectedProject ? 'not-allowed' : 'pointer',
                            boxShadow: isGenerating || !selectedProject ? 'none' : '0 4px 16px rgba(16,185,129,0.3)',
                            transition: 'all 0.2s',
                        }}
                    >
                        {isGenerating ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={18} />}
                        {isGenerating ? (captureStep || 'Génération…') : 'Télécharger le Dossier PC'}
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
                            Choisissez un client pour générer son Permis de Construire.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        {/* SAISIE UTILISATEUR */}
                        <div style={{ background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                            <h3 style={{ fontWeight: 800, marginBottom: 16, color: '#1e293b' }}>Complétez le dossier PC</h3>
                            
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Notice Agricole / Notice Descriptive (PC04)</label>
                                <Textarea 
                                    value={noticeText} 
                                    onChange={handleNoticeChange} 
                                    placeholder="Saisissez ou collez la notice descriptive du projet..."
                                    rows={6}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Photo Avant Projet (PC06)</label>
                                    <Input type="file" accept="image/*" onChange={(e) => handlePhotoUpload('avant', e)} />
                                    {pcPhotos.avant && <img src={pcPhotos.avant} alt="Avant" style={{ marginTop: 8, height: 100, objectFit: 'cover', borderRadius: 8 }} />}
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Insertion Paysagère (Après Projet) (PC06)</label>
                                    <Input type="file" accept="image/*" onChange={(e) => handlePhotoUpload('apres', e)} />
                                    {pcPhotos.apres && <img src={pcPhotos.apres} alt="Après" style={{ marginTop: 8, height: 100, objectFit: 'cover', borderRadius: 8 }} />}
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Photo Environnement Proche (PC07)</label>
                                    <Input type="file" accept="image/*" onChange={(e) => handlePhotoUpload('proche', e)} />
                                    {pcPhotos.proche && <img src={pcPhotos.proche} alt="Proche" style={{ marginTop: 8, height: 100, objectFit: 'cover', borderRadius: 8 }} />}
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Photo Environnement Lointain (PC08)</label>
                                    <Input type="file" accept="image/*" onChange={(e) => handlePhotoUpload('lointain', e)} />
                                    {pcPhotos.lointain && <img src={pcPhotos.lointain} alt="Lointain" style={{ marginTop: 8, height: 100, objectFit: 'cover', borderRadius: 8 }} />}
                                </div>
                            </div>
                        </div>

                        {/* PLANCHES PREVIEWS */}
                        <PCPlatePreview id="pc-plate-cover" label="Page de garde" clientLinked>
                            <PlateCover project={selectedProject} />
                        </PCPlatePreview>

                        <PCPlatePreview id="pc-plate-situation" label="PC01 — Plan de situation" clientLinked>
                            <PlateSituation project={selectedProject} captures={selectedProject.urbanisme_captures || {}} />
                        </PCPlatePreview>

                        <PCPlatePreview id="pc-plate-masse" label="PC02 — Plan de masse" clientLinked>
                            <PlateMasse project={selectedProject} captures={selectedProject.urbanisme_captures || {}} />
                        </PCPlatePreview>

                        <PCPlatePreview id="pc-plate-section" label="PC03 — Plan en coupe">
                            <PlateSection project={selectedProject} />
                        </PCPlatePreview>

                        <PCPlatePreview id="pc-plate-notice" label="PC04 — Notice descriptive" clientLinked>
                            <PlateNotice project={selectedProject} noticeText={noticeText} />
                        </PCPlatePreview>

                        <PCPlatePreview id="pc-plate-facades" label="PC05 — Façades et toitures">
                            <PlateFacades project={selectedProject} />
                        </PCPlatePreview>

                        <PCPlatePreview id="pc-plate-insertion" label="PC06 — Insertion paysagère" clientLinked>
                            <PlateInsertion project={selectedProject} photos={pcPhotos} />
                        </PCPlatePreview>

                        <PCPlatePreview id="pc-plate-env" label="PC07/08 — Environnement proche et lointain" clientLinked>
                            <PlateEnvProcheLointain project={selectedProject} photos={pcPhotos} />
                        </PCPlatePreview>
                    </div>
                )}
            </div>

            {selectedProject && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}>
                    <div id="pc-plate-cover"><PlateCover project={selectedProject} /></div>
                    <div id="pc-plate-situation"><PlateSituation project={selectedProject} captures={selectedProject.urbanisme_captures || {}} /></div>
                    <div id="pc-plate-masse"><PlateMasse project={selectedProject} captures={selectedProject.urbanisme_captures || {}} /></div>
                    <div id="pc-plate-section"><PlateSection project={selectedProject} /></div>
                    <div id="pc-plate-notice"><PlateNotice project={selectedProject} noticeText={noticeText} /></div>
                    <div id="pc-plate-facades"><PlateFacades project={selectedProject} /></div>
                    <div id="pc-plate-insertion"><PlateInsertion project={selectedProject} photos={pcPhotos} /></div>
                    <div id="pc-plate-env"><PlateEnvProcheLointain project={selectedProject} photos={pcPhotos} /></div>
                </div>
            )}
        </div>
    );
}

function PCPlatePreview({ id, label, children, fixed, clientLinked }) {
    return (
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px', borderBottom: '1px solid #f1f5f9',
                background: fixed ? '#fefce8' : clientLinked ? '#eff6ff' : '#f8fafc',
            }}>
                <FileText size={16} color={fixed ? '#ca8a04' : clientLinked ? '#10b981' : '#64748b'} />
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
                        background: '#d1fae5', color: '#047857',
                    }}>Lié au client</span>
                )}
            </div>
            <div style={{
                padding: '20px', background: '#f8fafc',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
            }}>
                <div style={{
                    width: '100%', maxWidth: '1122.5px',
                    aspectRatio: '297/210',
                    background: 'white',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    position: 'relative',
                }}>
                    <div style={{
                        width: '297mm', height: '210mm',
                        transform: 'scale(calc(100cqw / 1122.5))',
                        transformOrigin: 'top left',
                        position: 'absolute', top: 0, left: 0
                    }}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
