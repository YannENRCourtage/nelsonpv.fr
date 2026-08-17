import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useProjects } from '@/contexts/ProjectContext.jsx';
import { db } from '@/config/firebase.js';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import {
  Calculator, FolderOpen, Database, Zap, Sun, Building2,
  Sliders, Search, X, ChevronLeft, ChevronRight, FileDown,
  Layers, CheckCircle2, UserCircle, Briefcase
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast.js';

// Sous-composants
import IrveFrontSimulator from '@/components/simulator/IrveFrontSimulator';
import SolarAutoconsoSimulator from '@/components/simulator/SolarAutoconsoSimulator';
import SolarRoofSimulator from '@/components/simulator/SolarRoofSimulator';
import BuildingStructureSimulator from '@/components/simulator/BuildingStructureSimulator';
import SimulatorDatabaseTab from '@/components/simulator/SimulatorDatabaseTab';
import SimulatorArchivesTab from '@/components/simulator/SimulatorArchivesTab';
import { generateCommercialOfferPDF } from '@/components/simulator/CommercialOfferPDF';

// ─── Composant ProjectSelect dans la barre latérale ─────────────────────────
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
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white rounded-xl text-xs transition-all border border-slate-700/60 text-left shadow-2xs"
        onClick={() => setShowSearch(!showSearch)}
      >
        <Search className="w-3.5 h-3.5 shrink-0 text-blue-400" />
        <span className="truncate flex-1 font-semibold">
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
                    <span className="text-[10px] text-slate-500 truncate">
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

  // ─── Onglet principal (côté GAUCHE) : 'simulateurs' | 'archives' | 'database' ─
  const [activeMainTab, setActiveMainTab] = useState('simulateurs');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ─── Sous-solution active dans l'onglet 'simulateurs' : 'irve' | 'autoconso' | 'toiture' | 'structure' ─
  const [activeSolution, setActiveSolution] = useState('autoconso');

  // ─── Projet CRM lié & Simulations enregistrées ─────────────────────────────
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [simulations, setSimulations] = useState([]);
  const [isLoadingSimulations, setIsLoadingSimulations] = useState(false);

  const selectedProject = (projects || []).find(p => p.id === selectedProjectId);

  // Collection Firebase
  const getSimulationsCollection = useCallback(() => {
    const tenantId = user?.activeTenantId || user?.tenantId || 'enr-courtage-energie';
    return collection(db, 'tenants', tenantId, 'unified_simulations');
  }, [user]);

  // Chargement des simulations depuis Firebase & LocalStorage
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

  // Sauvegarde d'une simulation
  const handleSaveSimulation = async (simData) => {
    const simId = `sim_${Date.now()}`;
    const payload = {
      id: simId,
      ...simData,
      clientProjectId: selectedProjectId || null,
      clientName: selectedProject?.name || selectedProject?.lastName || simData.cityName || 'Client Privé',
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
      title: 'Simulation enregistrée dans les Archives !',
      description: payload.title || 'Votre étude est prête et archivée.',
    });
  };

  // Suppression d'une simulation
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

  // Charger une simulation depuis les archives vers le simulateur
  const handleLoadSimulation = (sim) => {
    if (sim.type === 'autoconsommation' || sim.projectType === 'solar') {
      setActiveSolution('autoconso');
    } else if (sim.type === 'toiture_pv') {
      setActiveSolution('toiture');
    } else if (sim.type === 'structure_metallique') {
      setActiveSolution('structure');
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

  // Export PDF A4 Offre Commerciale
  const handleExportPDF = async (simToExport = null) => {
    const targetSim = simToExport || {
      type: activeSolution === 'autoconso' ? 'autoconsommation'
        : activeSolution === 'toiture' ? 'toiture_pv'
        : activeSolution === 'structure' ? 'structure_metallique'
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
    <div className="flex h-[calc(100vh-64px)] bg-slate-100 overflow-hidden font-sans">
      
      {/* ═══════════════════════════════════════════════════════════════════════
          BARRE LATÉRALE GAUCHE — FOND BLEU CRM (#0e2b4d / #0f172a)
          3 ONGLETS VERTICAUX : "Simulateurs", "Archives", "Base de données"
         ═══════════════════════════════════════════════════════════════════════ */}
      <aside className={`bg-[#0e2b4d] text-white flex flex-col shrink-0 transition-all duration-300 ease-in-out border-r border-slate-800 ${
        sidebarOpen ? 'w-72' : 'w-16'
      }`}>
        
        {/* Titre / En-tête Sidebar */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between min-h-[64px]">
          {sidebarOpen ? (
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                Simulateurs Pro
              </h2>
              <p className="text-[10.5px] text-slate-400 font-semibold">ENR Courtage Énergie</p>
            </div>
          ) : (
            <Calculator className="w-5 h-5 text-amber-400 mx-auto" />
          )}

          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors ml-auto"
            title={sidebarOpen ? 'Réduire le menu' : 'Agrandir le menu'}
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Projet CRM lié */}
        {sidebarOpen && (
          <div className="p-4 border-b border-white/10 bg-slate-900/40">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              Projet CRM Associé
            </span>
            <ProjectSelect
              projects={projects || []}
              activeProjectId={selectedProjectId}
              onSelect={setSelectedProjectId}
            />
            {selectedProject && (
              <div className="mt-2 bg-blue-950/70 border border-blue-800/60 rounded-xl p-2 text-[11px]">
                <p className="font-bold text-blue-200 truncate">{selectedProject.name}</p>
                <p className="text-slate-400 text-[10px] truncate">{selectedProject.address || selectedProject.city || 'Aucune adresse'}</p>
              </div>
            )}
          </div>
        )}

        {/* 3 ONGLETS DE NAVIGATION DISPOSÉS VERTICALEMENT (STYLE CRM) */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {[
            {
              id: 'simulateurs',
              label: 'Simulateurs',
              desc: '4 outils de simulation',
              icon: Calculator,
              color: 'from-blue-600 to-indigo-600',
              activeRing: 'ring-blue-400'
            },
            {
              id: 'archives',
              label: 'Archives',
              desc: `${simulations.length} dossier(s) sauvegardé(s)`,
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
                    <span className="font-extrabold text-xs block leading-tight">{item.label}</span>
                    <span className="text-[10px] text-white/70 block mt-0.5 truncate">{item.desc}</span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        {sidebarOpen && (
          <div className="p-4 border-t border-white/10 text-center text-[10px] text-slate-400">
            <p className="font-bold text-slate-300">NELSON Platform</p>
            <p>© {new Date().getFullYear()} ENR Courtage</p>
          </div>
        )}
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE DE CONTENU PRINCIPALE (DROITE)
         ═══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        
        {/* Barre supérieure */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-slate-900">
              {activeMainTab === 'simulateurs' && 'Interface de Simulation'}
              {activeMainTab === 'archives' && 'Archives des Études Commerciales'}
              {activeMainTab === 'database' && 'Paramétrage & Base de Données des 4 Solutions'}
            </h1>
            {selectedProject && (
              <span className="text-xs font-bold bg-blue-50 text-blue-800 px-3 py-1 rounded-xl border border-blue-200">
                Client : {selectedProject.name}
              </span>
            )}
          </div>

          {activeMainTab === 'simulateurs' && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {[
                { id: 'autoconso', label: 'Autoconsommation', icon: Sun, color: 'text-amber-500' },
                { id: 'toiture', label: 'Toiture PV', icon: Building2, color: 'text-blue-500' },
                { id: 'structure', label: 'Structure Métallique', icon: Sliders, color: 'text-indigo-500' },
                { id: 'irve', label: 'Borne IRVE', icon: Zap, color: 'text-emerald-500' },
              ].map(sol => {
                const Icon = sol.icon;
                const isSelected = activeSolution === sol.id;
                return (
                  <button
                    key={sol.id}
                    type="button"
                    onClick={() => setActiveSolution(sol.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      isSelected
                        ? 'bg-[#0e2b4d] text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : sol.color}`} />
                    <span>{sol.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="flex-1 p-6">
          
          {/* ═══ ONGLET 1 : SIMULATEURS (FRONT-OFFICE) ═══════════════════════ */}
          {activeMainTab === 'simulateurs' && (
            <div>
              {activeSolution === 'autoconso' && (
                <SolarAutoconsoSimulator
                  selectedProject={selectedProject}
                  onSaveSimulation={handleSaveSimulation}
                  onExportPDF={() => handleExportPDF()}
                />
              )}

              {activeSolution === 'toiture' && (
                <SolarRoofSimulator
                  selectedProject={selectedProject}
                  onSaveSimulation={handleSaveSimulation}
                  onExportPDF={() => handleExportPDF()}
                />
              )}

              {activeSolution === 'structure' && (
                <BuildingStructureSimulator
                  selectedProject={selectedProject}
                  onSaveSimulation={handleSaveSimulation}
                  onExportPDF={() => handleExportPDF()}
                />
              )}

              {activeSolution === 'irve' && (
                <IrveFrontSimulator
                  selectedProject={selectedProject}
                  onSaveSimulation={handleSaveSimulation}
                  onExportPDF={() => handleExportPDF()}
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
