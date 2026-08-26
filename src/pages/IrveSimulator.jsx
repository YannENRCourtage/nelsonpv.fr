import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useProjects } from '@/contexts/ProjectContext.jsx';
import { db } from '@/config/firebase.js';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import {
  Calculator, FolderOpen, Database, Zap, Sun, Building2,
  Sliders, Search, X, ChevronLeft, ChevronRight, FileDown, Save,
  Briefcase, Wheat
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast.js';

// Sous-composants
import IrveFrontSimulator from '@/components/simulator/IrveFrontSimulator';
import SolarAutoconsoSimulator from '@/components/simulator/SolarAutoconsoSimulator';
import SolarRoofSimulator from '@/components/simulator/SolarRoofSimulator';
import BuildingStructureSimulator from '@/components/simulator/BuildingStructureSimulator';
import SechoirBatitechSimulator from '@/components/simulator/sechoir/SechoirBatitechSimulator';
import SimulatorDatabaseTab from '@/components/simulator/SimulatorDatabaseTab';
import SimulatorArchivesTab from '@/components/simulator/SimulatorArchivesTab';
import { generateCommercialOfferPDF } from '@/components/simulator/CommercialOfferPDF';

// ─── Sélecteur de projet CRM dans la barre latérale ─────────────────────────
const ProjectSelect = ({ projects, activeProjectId, onSelect }) => {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const dropdownRef = useRef(null);

  const filteredProjects = React.useMemo(() => {
    if (!search) return projects;
    return projects.filter(p =>
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.address || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.city || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [projects, search]);

  const activeProject = projects.find(p => p.id === activeProjectId);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700/60 text-left shadow-2xs"
        onClick={() => setShowSearch(!showSearch)}
      >
        <Search className="w-4 h-4 shrink-0 text-blue-400" />
        <span className="truncate flex-1">
          {activeProject ? activeProject.name : 'Sélectionner un projet CRM...'}
        </span>
      </button>

      {showSearch && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[200] max-h-[280px] flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                autoFocus
                placeholder="Rechercher un dossier..."
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-xl bg-slate-50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto py-1">
            <button
              type="button"
              className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 text-slate-400 italic"
              onClick={() => { onSelect(null); setShowSearch(false); }}
            >
              — Aucun projet lié —
            </button>
            {filteredProjects.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500 text-center italic">Aucun projet trouvé</div>
            ) : (
              filteredProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`w-full text-left px-3.5 py-2 text-xs hover:bg-blue-50/80 transition-colors flex flex-col gap-0.5 ${
                    activeProjectId === project.id ? 'bg-blue-50 border-l-3 border-blue-600 font-bold' : ''
                  }`}
                  onClick={() => { onSelect(project.id); setShowSearch(false); }}
                >
                  <span className="font-bold text-slate-900 truncate">{project.name}</span>
                  {(project.address || project.city) && (
                    <span className="text-[11px] text-slate-500 truncate">
                      {[project.address, project.zip, project.city].filter(Boolean).join(' ')}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function IrveSimulator() {
  const { user } = useAuth();
  const { projects } = useProjects();

  // ─── Navigation Principale Gauche : 'simulateurs' | 'archives' | 'database' ─
  const [activeMainTab, setActiveMainTab] = useState('simulateurs');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ─── Sous-solution active : 'autoconso' | 'toiture' | 'structure' | 'irve' | 'sechoir' ──
  const [activeSolution, setActiveSolution] = useState('autoconso');

  // ─── Projet CRM lié & Simulations ──────────────────────────────────────────
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [simulations, setSimulations] = useState([]);
  const [isLoadingSimulations, setIsLoadingSimulations] = useState(false);

  // ─── État dynamique de la simulation en cours pour actions globales ────────
  const [activeSimulationState, setActiveSimulationState] = useState(null);

  const selectedProject = (projects || []).find(p => p.id === selectedProjectId);

  const getSimulationsCollection = useCallback(() => {
    const tenantId = user?.activeTenantId || user?.tenantId || 'enr-courtage-energie';
    return collection(db, 'tenants', tenantId, 'unified_simulations');
  }, [user]);

  const loadSimulations = useCallback(async () => {
    setIsLoadingSimulations(true);
    try {
      const col = getSimulationsCollection();
      const q = query(col, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSimulations(list);
    } catch (err) {
      console.warn('Chargement Firebase fallback localStorage:', err);
      try {
        const local = localStorage.getItem('nelson_saved_simulations');
        if (local) setSimulations(JSON.parse(local));
      } catch (e) {}
    } finally {
      setIsLoadingSimulations(false);
    }
  }, [getSimulationsCollection]);

  useEffect(() => {
    loadSimulations();
  }, [loadSimulations]);

  // Sauvegarde
  const handleSaveCurrentSimulation = async (customData = null) => {
    const dataToSave = customData || activeSimulationState || {
      type: activeSolution,
      title: `Simulation ${activeSolution.toUpperCase()} — ${selectedProject?.name || 'Étude'}`
    };

    const simId = `sim_${Date.now()}`;
    const payload = {
      id: simId,
      ...dataToSave,
      clientProjectId: selectedProjectId || null,
      clientName: selectedProject?.name || selectedProject?.lastName || dataToSave.cityName || 'Client Privé',
      createdAt: new Date().toISOString()
    };

    try {
      const col = getSimulationsCollection();
      await setDoc(doc(col, simId), payload);
    } catch (err) {
      console.warn('Erreur Firebase save, fallback localStorage:', err);
    }

    setSimulations(prev => {
      const updated = [payload, ...prev];
      try {
        localStorage.setItem('nelson_saved_simulations', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    toast({
      title: 'Simulation enregistrée !',
      description: payload.title || 'Votre étude est sauvegardée dans les archives.',
    });
  };

  // Suppression
  const handleDeleteSimulation = async (simId) => {
    try {
      const col = getSimulationsCollection();
      await deleteDoc(doc(col, simId));
    } catch (err) {
      console.warn('Erreur delete Firebase:', err);
    }

    setSimulations(prev => {
      const updated = prev.filter(s => s.id !== simId);
      try {
        localStorage.setItem('nelson_saved_simulations', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    toast({
      title: 'Simulation supprimée',
      description: 'Le dossier a été retiré des archives.',
    });
  };

  // Charger depuis les archives
  const handleLoadSimulation = (sim) => {
    if (sim.type === 'autoconsommation' || sim.projectType === 'solar') {
      setActiveSolution('autoconso');
    } else if (sim.type === 'toiture_pv') {
      setActiveSolution('toiture');
    } else if (sim.type === 'structure_metallique') {
      setActiveSolution('structure');
    } else if (sim.type === 'sechoir_batitech') {
      setActiveSolution('sechoir');
    } else {
      setActiveSolution('irve');
    }
    setActiveMainTab('simulateurs');
    if (sim.clientProjectId) setSelectedProjectId(sim.clientProjectId);
    toast({
      title: 'Simulation chargée',
      description: `Affichage de : ${sim.title || sim.name}`,
    });
  };

  // Export PDF A4 Portrait
  const handleExportPDF = async (simToExport = null) => {
    const targetSim = simToExport || activeSimulationState || {
      type: activeSolution === 'autoconso' ? 'autoconsommation'
        : activeSolution === 'toiture' ? 'toiture_pv'
        : activeSolution === 'structure' ? 'structure_metallique'
        : activeSolution === 'sechoir' ? 'sechoir_batitech'
        : 'irve',
      title: `Simulation ${activeSolution.toUpperCase()} — ${selectedProject?.name || 'Étude'}`,
      cityName: selectedProject?.city || 'Condom',
      address: selectedProject?.address || 'Site du Projet',
      kwc: selectedProject?.kwc || 9,
      roofSurface: 83,
      annualProductionKwh: 11250,
      annualBenefitYear1: 2450,
      paybackYear: 7,
      totalInvestmentHT: 13500
    };

    await generateCommercialOfferPDF({
      simulation: targetSim,
      selectedProject
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-100 overflow-hidden font-sans text-[15px]">
      
      {/* ═══════════════════════════════════════════════════════════════════════
          BARRE LATÉRALE GAUCHE (FOND BLEU CRM #0e2b4d) — TYPO AGRANDIE DE 2PT
         ═══════════════════════════════════════════════════════════════════════ */}
      <aside className={`bg-[#0e2b4d] text-white flex flex-col shrink-0 transition-all duration-300 ease-in-out border-r border-slate-800 ${
        sidebarOpen ? 'w-72' : 'w-16'
      }`}>
        
        <div className="p-4 border-b border-white/10 flex items-center justify-between min-h-[64px]">
          {sidebarOpen ? (
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                Simulateurs Pro
              </h2>
              <p className="text-xs text-slate-400 font-semibold">ENR Courtage Énergie</p>
            </div>
          ) : (
            <Calculator className="w-6 h-6 text-amber-400 mx-auto" />
          )}

          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-auto"
            title={sidebarOpen ? 'Réduire le menu' : 'Agrandir le menu'}
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {sidebarOpen && (
          <div className="p-4 border-b border-white/10 bg-slate-900/40">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-blue-400" />
              Projet CRM Associé
            </span>
            <ProjectSelect
              projects={projects || []}
              activeProjectId={selectedProjectId}
              onSelect={setSelectedProjectId}
            />
            {selectedProject && (
              <div className="mt-2 bg-blue-950/70 border border-blue-800/60 rounded-xl p-2.5 text-xs">
                <p className="font-bold text-blue-200 truncate">{selectedProject.name}</p>
                <p className="text-slate-400 text-xs truncate">{selectedProject.address || selectedProject.city || 'Aucune adresse'}</p>
              </div>
            )}
          </div>
        )}

        {/* 3 ONGLETS VERTICAUX */}
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {[
            {
              id: 'simulateurs',
              label: 'Simulateurs',
              desc: '4 solutions clés en main',
              icon: Calculator,
              color: 'from-blue-600 to-indigo-600',
              activeRing: 'ring-blue-400'
            },
            {
              id: 'archives',
              label: 'Archives',
              desc: `${simulations.length} étude(s) sauvegardée(s)`,
              icon: FolderOpen,
              color: 'from-amber-500 to-amber-600',
              activeRing: 'ring-amber-400'
            },
            {
              id: 'database',
              label: 'Base de données',
              desc: 'Paramétrage & Tarifs',
              icon: Database,
              color: 'from-emerald-600 to-teal-600',
              activeRing: 'ring-emerald-400'
            }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeMainTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveMainTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 text-left ${
                  isActive
                    ? `bg-gradient-to-r ${item.color} text-white shadow-xl ring-2 ${item.activeRing}`
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {sidebarOpen && (
                  <div className="min-w-0 flex-1">
                    <span className="font-black text-base block leading-tight">{item.label}</span>
                    <span className="text-xs font-semibold text-white/80 block mt-1 truncate">{item.desc}</span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {sidebarOpen && (
          <div className="p-4 border-t border-white/10 text-center text-xs text-slate-400">
            <p className="font-bold text-slate-300">NELSON Platform</p>
            <p>© {new Date().getFullYear()} ENR Courtage</p>
          </div>
        )}
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE DE CONTENU PRINCIPALE (SANS SCROLL INUTILE)
         ═══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        
        {/* BARRE SUPÉRIEURE AVEC LES 4 SOLUTIONS ET LES BOUTONS SAUVEGARDER / PDF */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3 shadow-2xs flex flex-col gap-2">
          
          {/* Ligne 1 : Titre et Sélecteur des 4 solutions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-slate-900">
                {activeMainTab === 'simulateurs' && 'Interface de Simulation'}
                {activeMainTab === 'archives' && 'Archives des Études Commerciales'}
                {activeMainTab === 'database' && 'Base de Données & Paramétrage'}
              </h1>
              {selectedProject && (
                <span className="text-xs font-bold bg-blue-50 text-blue-800 px-3 py-1 rounded-xl border border-blue-200">
                  Dossier : {selectedProject.name}
                </span>
              )}
            </div>

            {activeMainTab === 'simulateurs' && (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                {[
                  { id: 'autoconso', label: 'Autoconsommation', icon: Sun, color: 'text-amber-500' },
                  { id: 'toiture', label: 'Toiture PV', icon: Building2, color: 'text-blue-500' },
                  { id: 'structure', label: 'Structure Métallique', icon: Sliders, color: 'text-indigo-500' },
                  { id: 'irve', label: 'Borne IRVE', icon: Zap, color: 'text-emerald-500' },
                  { id: 'sechoir', label: 'Séchoir BatiTech', icon: Wheat, color: 'text-orange-500' },
                ].map(sol => {
                  const Icon = sol.icon;
                  const isSelected = activeSolution === sol.id;
                  return (
                    <button
                      key={sol.id}
                      type="button"
                      onClick={() => setActiveSolution(sol.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${
                        isSelected
                          ? 'bg-[#0e2b4d] text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : sol.color}`} />
                      <span>{sol.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ligne 2 : BOUTONS SAUVEGARDER ET PDF ALIGNÉS EN HAUT À DROITE SOUS LES BOUTONS SOLUTIONS */}
          {activeMainTab === 'simulateurs' && (
            <div className="flex items-center justify-end gap-2.5 pt-0.5">
              <button
                type="button"
                onClick={() => handleSaveCurrentSimulation()}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all hover:scale-105"
                title="Sauvegarder l'étude en cours dans les archives"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                Sauvegarder
              </button>

              <button
                type="button"
                onClick={() => handleExportPDF()}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all hover:scale-105"
                title="Générer l'Offre Commerciale au format PDF A4 Portrait"
              >
                <FileDown className="w-3.5 h-3.5" />
                PDF
              </button>
            </div>
          )}
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="flex-1 p-5">
          
          {/* ═══ ONGLET 1 : SIMULATEURS (FRONT-OFFICE) ═══════════════════════ */}
          {activeMainTab === 'simulateurs' && (
            <div>
              {activeSolution === 'autoconso' && (
                <SolarAutoconsoSimulator
                  selectedProject={selectedProject}
                  onSaveSimulation={handleSaveCurrentSimulation}
                  onExportPDF={() => handleExportPDF()}
                  onStateUpdate={setActiveSimulationState}
                />
              )}

              {activeSolution === 'toiture' && (
                <SolarRoofSimulator
                  selectedProject={selectedProject}
                  onSaveSimulation={handleSaveCurrentSimulation}
                  onExportPDF={() => handleExportPDF()}
                  onStateUpdate={setActiveSimulationState}
                />
              )}

              {activeSolution === 'structure' && (
                <BuildingStructureSimulator
                  selectedProject={selectedProject}
                  onSaveSimulation={handleSaveCurrentSimulation}
                  onExportPDF={() => handleExportPDF()}
                  onStateUpdate={setActiveSimulationState}
                />
              )}

              {activeSolution === 'irve' && (
                <IrveFrontSimulator
                  selectedProject={selectedProject}
                  onSaveSimulation={handleSaveCurrentSimulation}
                  onExportPDF={() => handleExportPDF()}
                  onStateUpdate={setActiveSimulationState}
                />
              )}

              {activeSolution === 'sechoir' && (
                <SechoirBatitechSimulator
                  selectedProject={selectedProject}
                  onSaveSimulation={handleSaveCurrentSimulation}
                  onExportPDF={() => handleExportPDF()}
                  onStateUpdate={setActiveSimulationState}
                />
              )}
            </div>
          )}

          {/* ═══ ONGLET 2 : ARCHIVES ═════════════════════════════════════════ */}
          {activeMainTab === 'archives' && (
            <SimulatorArchivesTab
              simulations={simulations}
              onLoadSimulation={handleLoadSimulation}
              onDeleteSimulation={handleDeleteSimulation}
              onExportPDF={handleExportPDF}
            />
          )}

          {/* ═══ ONGLET 3 : BASE DE DONNÉES (BACK-OFFICE) ════════════════════ */}
          {activeMainTab === 'database' && (
            <SimulatorDatabaseTab />
          )}

        </div>

      </main>

    </div>
  );
}
