import React, { useState, useEffect } from 'react';
import { Cable, User, Search, FileText, Download, Zap, GitBranch, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * Onglet "Raccordement Batterie" de la page Développement
 * Présente le schéma de raccordement réseau pour les armoires de stockage batterie
 */
export default function RaccordementBatterie({ projects, selectedProject, setSelectedProject }) {
    const [search, setSearch] = useState('');

    const filtered = projects.filter((p) => {
        const q = search.toLowerCase();
        return `${p.firstName || ''} ${p.name || ''} ${p.city || ''}`.toLowerCase().includes(q);
    });

    const proj = selectedProject;
    const batteryName = proj?.battery_model || 'CESC Mercury 261';
    const batteryQty = proj?.battery_quantity || 2;

    return (
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* ── Panneau Sélection Client ──────────────────────────────── */}
            <div style={{
                width: 300, minWidth: 300, background: 'white',
                borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column',
                height: 'calc(100vh - 64px)', position: 'sticky', top: 0, overflowY: 'auto',
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
                    {filtered.map((p) => {
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
                                    borderLeft: isSelected ? '3px solid #8b5cf6' : '3px solid transparent',
                                }}
                            >
                                <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? '#6d28d9' : '#1e293b' }}>
                                    {clientName || 'Client sans nom'}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                    {p.city || '—'} {p.zip ? `(${p.zip})` : ''}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Zone Raccordement ─────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                {/* Header */}
                <div style={{
                    background: 'white', borderRadius: 16, padding: '20px 28px',
                    boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 28,
                    borderLeft: '4px solid #8b5cf6',
                }}>
                    <h2 style={{ fontWeight: 900, fontSize: 20, color: '#0f172a', margin: 0 }}>
                        <Cable size={22} style={{ marginRight: 10, display: 'inline', verticalAlign: 'middle', color: '#8b5cf6' }} />
                        Raccordement Batterie au Réseau ENEDIS
                    </h2>
                    {proj ? (
                        <p style={{ fontSize: 13, color: '#8b5cf6', margin: '6px 0 0', fontWeight: 600 }}>
                            Client : {`${proj.firstName || ''} ${proj.name || ''}`.trim()} — {proj.city} {proj.zip}
                        </p>
                    ) : (
                        <p style={{ fontSize: 13, color: '#94a3b8', margin: '6px 0 0' }}>
                            Sélectionnez un client pour voir les détails de raccordement
                        </p>
                    )}
                </div>

                {!proj ? (
                    <EmptyState />
                ) : (
                    <DPContent proj={proj} batteryName={batteryName} initialQty={batteryQty} />
                )}
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 80, background: 'white', borderRadius: 20, border: '2px dashed #e2e8f0',
        }}>
            <Cable size={48} color="#cbd5e1" />
            <h3 style={{ color: '#94a3b8', marginTop: 16, fontWeight: 700 }}>Aucun client sélectionné</h3>
            <p style={{ color: '#94a3b8', fontSize: 13 }}>
                Choisissez un client pour visualiser le schéma de raccordement.
            </p>
        </div>
    );
}

function DPContent({ proj, batteryName, initialQty }) {
    const [batteryQty, setBatteryQty] = React.useState(initialQty);
    const power = batteryQty * 125;
    const capacity = batteryQty * 261;

    // Reset quand le projet change
    React.useEffect(() => {
        setBatteryQty(proj?.battery_quantity || 2);
    }, [proj?.id]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <TechnicalSummary proj={proj} batteryName={batteryName} batteryQty={batteryQty} setBatteryQty={setBatteryQty} power={power} capacity={capacity} />
            <RaccordementSchema proj={proj} batteryName={batteryName} batteryQty={batteryQty} power={power} />
            <RaccordementNotice proj={proj} batteryName={batteryName} batteryQty={batteryQty} power={power} capacity={capacity} />
            <DemarchesChecklist />
        </div>
    );
}

function TechnicalSummary({ proj, batteryName, batteryQty, setBatteryQty, power, capacity }) {
    const cards = [
        { label: 'Modèle batterie', value: batteryName, color: '#7c3aed', bg: '#f5f3ff' },
        { label: 'Nombre d\'armoires', value: null, color: '#2563eb', bg: '#eff6ff', editable: true },
        { label: 'Puissance totale', value: `${power} kW`, color: '#059669', bg: '#ecfdf5' },
        { label: 'Capacité totale', value: `${capacity} kWh`, color: '#d97706', bg: '#fffbeb' },
        { label: 'Raccordement', value: 'ENEDIS HTB/HTA', color: '#dc2626', bg: '#fef2f2' },
        { label: 'Type de service', value: 'Injection / Soutirage', color: '#0891b2', bg: '#ecfeff' },
    ];

    return (
        <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={16} color="#8b5cf6" />
                Résumé technique de l'installation
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {cards.map((c, i) => (
                    <div key={i} style={{
                        background: c.bg, borderRadius: 12, padding: '14px 16px',
                        border: `1px solid ${c.color}22`,
                    }}>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
                        {c.editable ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={batteryQty}
                                    onChange={e => setBatteryQty(Math.max(1, parseInt(e.target.value) || 1))}
                                    style={{
                                        width: 50, fontSize: 18, fontWeight: 800, color: c.color,
                                        border: `2px solid ${c.color}44`, borderRadius: 8,
                                        padding: '2px 6px', textAlign: 'center',
                                        outline: 'none', background: 'white',
                                    }}
                                />
                                <span style={{ fontSize: 14, fontWeight: 700, color: c.color }}>unité(s)</span>
                            </div>
                        ) : (
                            <div style={{ fontSize: 18, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function RaccordementSchema({ proj, batteryName, batteryQty, power }) {
    // Calcul dynamique des positions des batteries
    const batteryH = 60;
    const batteryGap = 10;
    const totalBattH = batteryQty * batteryH + (batteryQty - 1) * batteryGap;
    const startY = Math.max(30, 170 - totalBattH / 2);
    const svgHeight = Math.max(340, startY + totalBattH + 60);
    const midY = startY + totalBattH / 2;

    return (
        <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <GitBranch size={16} color="#2563eb" />
                Schéma de raccordement — {proj?.city || ''}
            </h3>

            {/* Schéma SVG dynamique */}
            <div style={{
                background: '#f8fafc', borderRadius: 12, padding: 24,
                border: '1px solid #e2e8f0', overflowX: 'auto',
            }}>
                <svg viewBox={`0 0 800 ${svgHeight}`} width="100%" height="auto" style={{ minWidth: 600 }}>
                    {/* ── Réseau ENEDIS ── */}
                    <rect x="10" y={midY - 50} width="140" height="100" rx="12" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
                    <text x="80" y={midY - 12} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1d4ed8">Réseau ENEDIS</text>
                    <text x="80" y={midY + 5} textAnchor="middle" fontSize="10" fill="#3b82f6">Distribution HTA/BT</text>
                    <text x="80" y={midY + 22} textAnchor="middle" fontSize="9" fill="#60a5fa">Point de livraison</text>
                    <text x="80" y={midY + 37} textAnchor="middle" fontSize="9" fill="#60a5fa">(PDL)</text>

                    {/* Câble réseau → Poste */}
                    <line x1="150" y1={midY} x2="230" y2={midY} stroke="#2563eb" strokeWidth="3" strokeDasharray="6,3" />
                    <text x="190" y={midY - 12} textAnchor="middle" fontSize="9" fill="#64748b">Câbles</text>
                    <text x="190" y={midY - 2} textAnchor="middle" fontSize="9" fill="#64748b">enterrés</text>

                    {/* ── Poste de transformation ── */}
                    <rect x="230" y={midY - 60} width="130" height="120" rx="12" fill="#ecfdf5" stroke="#059669" strokeWidth="2" />
                    <text x="295" y={midY - 22} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#065f46">Poste de</text>
                    <text x="295" y={midY - 6} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#065f46">Transformation</text>
                    <text x="295" y={midY + 13} textAnchor="middle" fontSize="10" fill="#059669">HTA/BT</text>
                    <text x="295" y={midY + 30} textAnchor="middle" fontSize="9" fill="#34d399">+ Compteur ENEDIS</text>
                    <text x="295" y={midY + 47} textAnchor="middle" fontSize="9" fill="#34d399">Bidirectionnel</text>

                    {/* Câble poste → Armoire distribution */}
                    <line x1="360" y1={midY} x2="440" y2={midY} stroke="#059669" strokeWidth="3" />
                    <text x="400" y={midY - 18} textAnchor="middle" fontSize="9" fill="#64748b">BT</text>
                    <text x="400" y={midY - 8} textAnchor="middle" fontSize="9" fill="#64748b">4 conducteurs</text>
                    <polygon points={`435,${midY - 6} 435,${midY + 6} 445,${midY}`} fill="#059669" />

                    {/* ── Armoire de distribution ── */}
                    <rect x="440" y={midY - 50} width="120" height="100" rx="12" fill="#fffbeb" stroke="#d97706" strokeWidth="2" />
                    <text x="500" y={midY - 12} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#92400e">Armoire de</text>
                    <text x="500" y={midY + 3} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#92400e">Distribution</text>
                    <text x="500" y={midY + 22} textAnchor="middle" fontSize="9" fill="#b45309">AC/DC Bidirectionnel</text>
                    <text x="500" y={midY + 37} textAnchor="middle" fontSize="9" fill="#b45309">+ Protection IGBT</text>

                    {/* Lignes vers batteries (une par armoire) */}
                    {Array.from({ length: batteryQty }).map((_, i) => {
                        const by = startY + i * (batteryH + batteryGap) + batteryH / 2;
                        return (
                            <line key={`line-${i}`} x1="560" y1={midY} x2="620" y2={by} stroke="#7c3aed" strokeWidth="2.5" />
                        );
                    })}

                    {/* ── Batteries ── */}
                    {Array.from({ length: batteryQty }).map((_, i) => {
                        const y = startY + i * (batteryH + batteryGap);
                        return (
                            <g key={i}>
                                <rect x="620" y={y} width="160" height={batteryH} rx="10" fill="#f5f3ff" stroke="#7c3aed" strokeWidth="2" />
                                <text x="700" y={y + 22} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#5b21b6">🔋 {batteryName}</text>
                                <text x="700" y={y + 37} textAnchor="middle" fontSize="9" fill="#7c3aed">261 kWh — 125 kW</text>
                                <text x="700" y={y + 50} textAnchor="middle" fontSize="8" fill="#a78bfa">Armoire {i + 1}/{batteryQty}</text>
                            </g>
                        );
                    })}

                    {/* Légende injection/soutirage */}
                    <text x="80" y="18" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#374151">INJECTION</text>
                    <line x1="30" y1="28" x2="130" y2="28" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
                    <text x="300" y="18" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#374151">SOUTIRAGE</text>
                    <line x1="250" y1="28" x2="350" y2="28" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,3" />

                    <defs>
                        <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="0" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L8,3 z" fill="#10b981" />
                        </marker>
                    </defs>
                </svg>
            </div>
        </div>
    );
}

function RaccordementNotice({ proj, batteryName, batteryQty, power, capacity }) {
    const address = proj?.address || '—';
    const city = proj?.city || proj?.cadastre_commune || '—';
    const dep = proj?.zip?.substring(0, 2) || '—';
    const section = proj?.cadastre_section || '—';
    const numero = proj?.cadastre_numero || '—';
    const emprise = (batteryQty * 7.5).toFixed(1);

    return (
        <div style={{ background: 'white', borderRadius: 16, padding: '24px 28px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', fontSize: 13, lineHeight: 1.7, color: '#1e293b' }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 20px', borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
                <FileText size={15} style={{ marginRight: 8, display: 'inline', verticalAlign: 'middle', color: '#2563eb' }} />
                Notice de raccordement — Demande ENEDIS
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Section title="1. OBJET DE LA DEMANDE">
                    La demande de raccordement porte sur l'installation de <strong>{batteryQty} armoire(s) de stockage stationnaire</strong> par batteries {batteryName}, 
                    d'une puissance totale de <strong>{power} kW</strong> et d'une capacité de <strong>{capacity} kWh</strong>, 
                    raccordée en injection-soutirage bidirectionnel au réseau public de distribution d'électricité ENEDIS, 
                    pour la fourniture de services système (arbitrage, réserve de fréquence, mécanisme de capacité).
                </Section>

                <Section title="2. LOCALISATION DU PROJET">
                    Le projet se situe à <strong>{address}</strong>, commune de <strong>{city}</strong>, département <strong>{dep}</strong>.{' '}
                    La parcelle concernée est la section <strong>{section} n°{numero}</strong>, surface de {proj?.cadastre_surface ? `${proj.cadastre_surface} m²` : '—'}.
                    L'emprise au sol de l'installation est de <strong>{emprise} m²</strong> (dalle béton + dégagements techniques).
                </Section>

                <Section title="3. CARACTÉRISTIQUES DU RACCORDEMENT">
                    <ul style={{ paddingLeft: 20, margin: '6px 0' }}>
                        <li>Type de raccordement : <strong>Injection et soutirage bidirectionnel</strong></li>
                        <li>Tension de raccordement : BT (≤ {power <= 250 ? '250 kW → BT 400V' : 'HTA 20kV selon capacité'})</li>
                        <li>Point de livraison (PDL) : à définir par ENEDIS selon contraintes réseau</li>
                        <li>Comptage ENEDIS : compteur communicant bidirectionnel Linky/Pro</li>
                        <li>Protection : disjoncteur différentiel + protection de découplage selon C13-200</li>
                        <li>Câblage : câbles enterrés entre armoires et PDL (cheminement à valider sur site)</li>
                    </ul>
                </Section>

                <Section title="4. SERVICES SYSTÈMES PRÉVUS">
                    <ul style={{ paddingLeft: 20, margin: '6px 0' }}>
                        <li><strong>aFFR / FCR :</strong> réponse automatique aux écarts de fréquence — rémunéré par RTE</li>
                        <li><strong>Activation d'énergie :</strong> injection/soutirage sur signal RTE — compensation prix spot</li>
                        <li><strong>Mécanisme de capacité :</strong> participation marché obligatoire (décret n°2012-1405)</li>
                        <li><strong>Arbitrage Trading :</strong> achat heures creuses / injection heures pleines</li>
                    </ul>
                </Section>

                <Section title="5. DÉMARCHES ENEDIS">
                    La demande de raccordement est à déposer sur <strong>ENEDIS Connect</strong> ou via le formulaire 
                    papier S16S (Demande de raccordement producteurs/stockeurs). 
                    Le délai de traitement est de <strong>3 à 6 mois</strong> selon la saturation du réseau local.
                    Une étude technique ENEDIS sera diligentée pour valider le point d'injection et les travaux à réaliser 
                    (renforcement réseau éventuel, pose compteur, etc.).
                </Section>
            </div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div>
            <h4 style={{ fontSize: 12, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px', borderBottom: '1px solid #f1f5f9', paddingBottom: 4 }}>
                {title}
            </h4>
            <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.7 }}>{children}</div>
        </div>
    );
}

function DemarchesChecklist() {
    const steps = [
        { label: 'Dépôt Déclaration Préalable (DP) en Mairie', done: false, delay: '1-3 mois' },
        { label: 'Demande de raccordement ENEDIS (formulaire S16S)', done: false, delay: '3-6 mois' },
        { label: 'Étude technique réseau par ENEDIS', done: false, delay: '2-4 mois' },
        { label: 'Devis de raccordement ENEDIS + signature', done: false, delay: '1-2 mois' },
        { label: 'Travaux de raccordement ENEDIS', done: false, delay: '1-3 mois' },
        { label: 'Mise en service et essais', done: false, delay: '1-2 sem.' },
        { label: 'Contrat de service système (ENEDIS / RTE)', done: false, delay: '1-3 mois' },
    ];

    return (
        <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} color="#059669" />
                Planning des démarches administratives et réseau
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {steps.map((s, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '12px 16px', borderRadius: 10,
                        background: s.done ? '#ecfdf5' : '#f8fafc',
                        border: `1px solid ${s.done ? '#a7f3d0' : '#e2e8f0'}`,
                    }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            background: s.done ? '#059669' : '#e2e8f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: 12, color: s.done ? 'white' : '#64748b',
                        }}>
                            {i + 1}
                        </div>
                        <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{s.label}</span>
                        <span style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                            background: '#f1f5f9', color: '#64748b',
                        }}>{s.delay}</span>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                    <strong>Délai global estimé : 12 à 24 mois</strong> de la DP à la mise en service complète. 
                    Les délais ENEDIS sont indicatifs et peuvent varier selon la saturation du réseau local et les travaux de renforcement nécessaires.
                </p>
            </div>
        </div>
    );
}
