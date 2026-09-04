import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { apiService } from '@/services/api';
import { toast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, FileText, Users, ChevronLeft, ChevronRight, Loader2,
  Briefcase, Sparkles, Building, Sun, Zap
} from 'lucide-react';

import html2canvas from 'html2canvas';

// Sub-components (Views)
import DossiersListView from '@/components/developpement/DossiersListView';
import EtudeDossierView from '@/components/developpement/EtudeDossierView';
import ProfessionnelsView from '@/components/developpement/ProfessionnelsView';

// Modals
import UrbanismeWizard from '@/components/developpement/UrbanismeWizard';
import EmailMandatementModal from '@/components/developpement/EmailMandatementModal';
import RaccordementModal from '@/components/developpement/RaccordementModal';
import AosAoModal from '@/components/developpement/AosAoModal';
import ConsuelModal from '@/components/developpement/ConsuelModal';

// Existing plate components (reused for PDF generation)
import {
  PlateCover,
  PlateSituation,
  PlateMasse,
  PlateSection,
  PlateCoupeMulti,
  PlateNoticeDedicated,
  PlateFacades,
  PlateInsertion as DPPlateInsertion,
  PlateInsertionNotice,
  PlateEnv,
  PlateEnvProche,
  PlateEnvLointain,
} from '@/components/editor/DPPlates';

import {
  PlateCover as PCPlateCover,
  PlateSituation as PCPlateSituation,
  PlateMasse as PCPlateMasse,
  PlateSectionAndNotice as PCPlateSectionAndNotice,
  PlateFacades as PCPlateFacades,
  PlateInsertion as PCPlateInsertion,
  PlateEnvProcheLointain as PCPlateEnv,
  PlateEnvProche as PCPlateEnvProche,
  PlateEnvLointain as PCPlateEnvLointain,
} from '@/components/editor/PCPlates';

// Services & Data
import { generateFullUrbanismePDF } from '@/services/UrbanismeDocService';
import { preloadProjectImages } from '@/utils/imageProxy';
import {
  getProfessionals, addProfessional, updateProfessional, deleteProfessional
} from '@/services/devWorkflowService';

// ── Sidebar Navigation Items ─────────────────────────────────────────────────
const SIDEBAR_SECTIONS = [
  { id: 'dossiers', label: 'Dossiers', icon: Folder },
  { id: 'etude', label: 'Étude dossier', icon: FileText },
  { id: 'professionnels', label: 'Professionnels', icon: Users },
];

export default function Developpement() {
  const { user, activeTenantId } = useAuth();
  const isAcama = activeTenantId === 'acama';
  const isGreenInvest = activeTenantId === 'green-invest' || activeTenantId === 'greeninvest' || user?.activeTenantId === 'green-invest' || user?.tenantId === 'green-invest' || user?.tenant === 'greeninvest';
  const isNoBattery = isAcama || isGreenInvest;
  const [activeSection, setActiveSection] = useState('dossiers');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  // Current user info
  const currentUser = {
    uid: user?.uid,
    name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.displayName || 'Utilisateur'),
    firstName: user?.firstName || 'Yann',
    displayName: user?.displayName || 'Yann BARBERIS',
    email: user?.email,
    role: user?.title || (user?.role === 'admin' ? 'Administrateur' : 'Chef de projet'),
    avatar: (user?.firstName?.[0] || user?.displayName?.[0] || 'Y').toUpperCase(),
    photoURL: user?.photoURL,
    color: user?.role === 'admin' ? 'bg-indigo-600' : 'bg-blue-600',
  };

  // ── Projects State ──────────────────────────────────────────────
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [pdfProjectState, setPdfProjectState] = useState(null);

  // ── Professionals State ─────────────────────────────────────────
  const [professionals, setProfessionals] = useState([]);

  // ── Modals State ────────────────────────────────────────────────
  const [urbanismeModal, setUrbanismeModal] = useState({ open: false, type: 'dp' });
  const [emailMandatementModal, setEmailMandatementModal] = useState({ open: false, type: 'geometre' });
  const [raccordementModal, setRaccordementModal] = useState(false);
  const [aosModal, setAosModal] = useState(false);
  const [consuelModal, setConsuelModal] = useState(false);

  // ── PDF Generation State ────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [captureStep, setCaptureStep] = useState('');

  // ── Load & Subscribe Projects in Real-Time ─────────────────────
  useEffect(() => {
    let unsubscribe = () => {};
    setLoadingProjects(true);

    const setupSubscription = async () => {
      try {
        const unsub = await apiService.subscribeToProjects((data) => {
          setProjects(data || []);
          setLoadingProjects(false);

          // Maintenir selectedProject synchronisé en temps réel avec Firestore
          setSelectedProject(prev => {
            if (!prev) return (data && data.length > 0) ? data[0] : null;
            const updated = data.find(p => p.id === prev.id);
            return updated || prev;
          });
        }, activeTenantId);
        if (typeof unsub === 'function') unsubscribe = unsub;
      } catch (err) {
        console.error('Erreur souscription temps réel projets:', err);
        try {
          const fallbackData = await apiService.getProjects(activeTenantId);
          setProjects(fallbackData || []);
          if (fallbackData && fallbackData.length > 0 && !selectedProject) {
            setSelectedProject(fallbackData[0]);
          }
        } catch (e) {
          console.error('Erreur fallback projets:', e);
        } finally {
          setLoadingProjects(false);
        }
      }
    };

    setupSubscription();

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeTenantId]);

  // ── Load Professionals ──────────────────────────────────────────
  useEffect(() => {
    const loadProfs = async () => {
      try {
        const data = await getProfessionals();
        if (data && data.length > 0) {
          setProfessionals(data);
        } else {
          // Default mock data
          const defaultProfs = [
            {
              id: 'prof-1',
              name: 'Dupont',
              firstName: 'Jean',
              company: 'SCP Dupont - Commissaires de Justice',
              phone: '05 56 12 34 56',
              email: 'huissier.dupont@justice.fr',
              address: '14 Rue Sainte-Catherine',
              zip: '33000',
              city: 'Bordeaux',
              categories: ['huissier'],
            },
            {
              id: 'prof-2',
              name: 'Lemoine',
              firstName: 'Claire',
              company: 'Cabinet Lemoine Géomètres-Experts',
              phone: '05 56 98 76 54',
              email: 'contact@lemoine-geometre.fr',
              address: '8 Boulevard de la Plage',
              zip: '33120',
              city: 'Arcachon',
              categories: ['geometre'],
            },
            {
              id: 'prof-3',
              name: 'Martin',
              firstName: 'Antoine',
              company: 'Étude Notariale Martin & Associés',
              phone: '05 53 45 67 89',
              email: 'notaire.martin@notaires.fr',
              address: '2 Place Gambetta',
              zip: '33000',
              city: 'Bordeaux',
              categories: ['notaire'],
            },
            {
              id: 'prof-4',
              name: 'Laval',
              firstName: 'Sophie',
              company: 'Atelier d\'Architecture Solaire DPLG',
              phone: '05 56 33 22 11',
              email: 'sophie.laval@archi-solaire.fr',
              address: '25 Quai des Chartrons',
              zip: '33000',
              city: 'Bordeaux',
              categories: ['architecte'],
            },
          ];
          setProfessionals(defaultProfs);
        }
      } catch (e) {
        console.error('Erreur chargement professionnels', e);
      }
    };
    loadProfs();
  }, []);

  // ── Handler Sélection Projet depuis la Liste ────────────────────
  const handleSelectProjectFromList = (proj) => {
    setSelectedProject(proj);
    setActiveSection('etude');
  };

  // ── Handlers Gestion Professionnels ─────────────────────────────
  const handleAddProfessional = async (profData) => {
    try {
      let newId = `prof-${Date.now()}`;
      try {
        newId = await addProfessional(profData);
      } catch (err) {
        console.warn('Sauvegarde locale fallback Firestore:', err);
      }
      setProfessionals(prev => [...prev, { id: newId, ...profData }]);
    } catch (e) {
      console.error('Erreur ajout professionnel:', e);
      throw e;
    }
  };

  const handleUpdateProfessional = async (id, profData) => {
    try {
      try {
        await updateProfessional(id, profData);
      } catch (err) {
        console.warn('Update local fallback Firestore:', err);
      }
      setProfessionals(prev => prev.map(p => p.id === id ? { ...p, ...profData } : p));
    } catch (e) {
      console.error('Erreur modif professionnel:', e);
      throw e;
    }
  };

  const handleDeleteProfessional = async (id) => {
    try {
      try {
        await deleteProfessional(id);
      } catch (err) {
        console.warn('Delete local fallback Firestore:', err);
      }
      setProfessionals(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Professionnel supprimé', description: 'Le contact a été retiré du répertoire.' });
    } catch (e) {
      console.error('Erreur suppression professionnel:', e);
    }
  };

  // ── Handlers Génération Document Urbanisme (PDF CERFA) ──────────
  const handleUrbanismeGenerate = async (docType, chosenType, finalProject, selectedPages) => {
    if (!selectedProject) return;
    setIsGenerating(true);
    setCaptureStep('Initialisation du dossier...');

    try {
      const initialProjectToUse = {
        ...selectedProject,
        ...(finalProject || {}),
        type: chosenType || finalProject?.type || selectedProject.type || 'batiment_solaire',
        installationType: chosenType || finalProject?.installationType || selectedProject.installationType || 'batiment_solaire'
      };

      // 1. Précharger et convertir toutes les images (Firebase Storage, satellite, cadastres, etc.) en Base64 Data URLs
      setCaptureStep('Chargement et sécurisation des images (Proxy CORS)...');
      const projectToUse = await preloadProjectImages(initialProjectToUse);

      setPdfProjectState(projectToUse);
      setSelectedProject(projectToUse);
      setProjects(prev => prev.map(p => p.id === initialProjectToUse.id ? projectToUse : p));

      // Laisser le temps à React de monter les planches dans le DOM avec les images en mémoire (Data URLs)
      await new Promise(r => setTimeout(r, 450));

      const isPC = docType === 'pc';
      const isCU = docType === 'cu';
      const prefix = isPC ? 'dev-pc-' : 'dev-';
      const bList = (projectToUse.buildings && projectToUse.buildings.length > 0) ? projectToUse.buildings : [projectToUse];

      let plateIds = [];
      if (isPC) {
        if (!selectedPages || selectedPages.situation) plateIds.push(`${prefix}plate-situation`);
        
        // Répéter PC2 (Plan de masse), PC3/PC4, PC5, PC6, PC7/PC8 pour chaque bâtiment configuré dans l'unique PDF
        for (let bIdx = 0; bIdx < bList.length; bIdx++) {
          const suffix = bIdx === 0 ? '' : `-${bIdx}`;
          if (!selectedPages || selectedPages.masse) {
            plateIds.push(bList.length === 1 && bIdx === 0 ? `${prefix}plate-masse` : `${prefix}plate-masse${suffix}`);
          }
          if (!selectedPages || selectedPages.section_notice) plateIds.push(`${prefix}plate-section-notice${suffix}`);
          if (!selectedPages || selectedPages.facades) plateIds.push(`${prefix}plate-facades${suffix}`);
          if (!selectedPages || selectedPages.insertion) plateIds.push(`${prefix}plate-insertion${suffix}`);
          
          // PC7 (Environnement proche) & PC8 (Paysage lointain) dissociés sur 2 pages distinctes
          const wantPC7 = !selectedPages || (selectedPages.env !== false && selectedPages.pc7 !== false && selectedPages.env_proche !== false);
          const wantPC8 = !selectedPages || (selectedPages.env !== false && selectedPages.pc8 !== false && selectedPages.env_lointain !== false);
          if (wantPC7) plateIds.push(`${prefix}plate-env-proche${suffix}`);
          if (wantPC8) plateIds.push(`${prefix}plate-env-lointain${suffix}`);
        }
      } else if (isCU) {
        if (!selectedPages || selectedPages.situation) plateIds.push(`dev-plate-situation`);
        if (!selectedPages || selectedPages.masse) plateIds.push(`dev-plate-masse`);
      } else {
        if (!selectedPages || selectedPages.situation !== false) plateIds.push(`dev-plate-situation`);

        for (let bIdx = 0; bIdx < bList.length; bIdx++) {
          const suffix = bIdx === 0 ? '' : `-${bIdx}`;
          if (!selectedPages || selectedPages.masse !== false) {
            plateIds.push(bList.length === 1 && bIdx === 0 ? `dev-plate-masse` : `dev-plate-masse${suffix}`);
          }
          if (!selectedPages || selectedPages.section !== false) plateIds.push(`dev-plate-section${suffix}`);
          if (!selectedPages || selectedPages.facades !== false) plateIds.push(`dev-plate-facades${suffix}`);
          if (!selectedPages || selectedPages.insertion !== false) plateIds.push(`dev-plate-insertion${suffix}`);
          
          // DP7 (Environnement proche) & DP8 (Paysage lointain) dissociés sur 2 pages distinctes
          const wantDP7 = !selectedPages || (selectedPages.env !== false && selectedPages.dp7 !== false && selectedPages.env_proche !== false);
          const wantDP8 = !selectedPages || (selectedPages.env !== false && selectedPages.dp8 !== false && selectedPages.env_lointain !== false);
          if (wantDP7) plateIds.push(`dev-plate-env-proche${suffix}`);
          if (wantDP8) plateIds.push(`dev-plate-env-lointain${suffix}`);
        }
      }

      await generateFullUrbanismePDF({
        type: docType,
        project: projectToUse,
        installationType: chosenType || projectToUse.type || 'batiment_solaire',
        plateIds: plateIds,
        includeCover: selectedPages ? !!selectedPages.cover : true,
        includeCerfa: selectedPages ? !!selectedPages.cerfa : true,
        onProgress: (msg) => setCaptureStep(msg)
      });

      toast({
        title: 'Dossier généré avec succès !',
        description: `Le dossier ${docType.toUpperCase()} interactif a été téléchargé.`,
      });
    } catch (err) {
      console.error('Erreur génération PDF urbanisme:', err);
      toast({
        title: 'Erreur de génération',
        description: 'Une erreur est survenue lors de la création du PDF : ' + (err?.message || ''),
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setCaptureStep('');
      setPdfProjectState(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-[#f6f7fb] overflow-hidden">
      {/* ═══ SIDEBAR NAVIGATION (Monday.com Style) ═══════════════════ */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-60'
        } bg-[#181b34] text-white flex flex-col justify-between transition-all duration-300 ease-in-out flex-shrink-0 z-20 shadow-xl`}
      >
        {/* Top Branding & Collapse Button */}
        <div>
          <div className="p-4 flex items-center justify-between border-b border-white/10">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-sm shadow-sm">
                  ⚡
                </div>
                <div>
                  <h1 className="font-extrabold text-sm tracking-wide text-white">Développement</h1>
                  <p className="text-[10px] text-white/50 font-medium">Gestion de projets solaires</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors mx-auto"
              title={sidebarCollapsed ? 'Déplier le menu' : 'Replier le menu'}
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {/* 3 Onglets Principaux */}
          <nav className="p-2 space-y-1.5 mt-2">
            {SIDEBAR_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-extrabold text-sm transition-all w-full text-left ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                  title={sidebarCollapsed ? section.label : undefined}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {!sidebarCollapsed && <span>{section.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info Bottom */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
            <div className={`${currentUser.color} w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs overflow-hidden flex-shrink-0`}>
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                currentUser.avatar
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-xs truncate">{currentUser.name}</p>
                <p className="text-[10px] text-white/40 truncate">{currentUser.role}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ═══ MAIN VIEWPORT (Full-Width Monday.com Design) ════════════ */}
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden w-full p-4 lg:p-6 space-y-6">
        {/* Overlay de chargement génération PDF */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm"
            >
              <Loader2 size={20} className="animate-spin text-blue-600" />
              <div>
                <p className="text-blue-900 font-bold text-xs">Génération du dossier en cours...</p>
                <p className="text-blue-600 text-[11px]">{captureStep}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── RENDU DE L'ONGLET SÉLECTIONNÉ ───────────────────────── */}
        <AnimatePresence mode="wait">
          {/* ONGLET 1 : DOSSIERS (Vue Tableau 2 Lignes) */}
          {activeSection === 'dossiers' && (
            <motion.div
              key="dossiers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <DossiersListView
                projects={projects}
                currentUser={currentUser}
                onSelectProject={handleSelectProjectFromList}
                activeProjectId={selectedProject?.id}
              />
            </motion.div>
          )}

          {/* ONGLET 2 : ÉTUDE DOSSIER (Workflow 9 Étapes) */}
          {activeSection === 'etude' && (
            <motion.div
              key="etude"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {!selectedProject ? (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200 space-y-4">
                  <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800">Aucun dossier sélectionné</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Veuillez sélectionner un dossier dans l'onglet "Dossiers" pour afficher et piloter son workflow.
                  </p>
                  <button
                    onClick={() => setActiveSection('dossiers')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    Aller aux dossiers
                  </button>
                </div>
              ) : (
                <EtudeDossierView
                  project={selectedProject}
                  allProjects={projects}
                  onBackToDossiers={() => setActiveSection('dossiers')}
                  onOpenUrbanismeWizard={(type) => setUrbanismeModal({ open: true, type })}
                  onOpenEmailMandatement={(type) => setEmailMandatementModal({ open: true, type })}
                  onOpenRaccordementModal={() => setRaccordementModal(true)}
                  onOpenAosModal={() => setAosModal(true)}
                  onOpenConsuelModal={() => setConsuelModal(true)}
                  professionals={professionals}
                />
              )}
            </motion.div>
          )}

          {/* ONGLET 3 : PROFESSIONNELS */}
          {activeSection === 'professionnels' && (
            <motion.div
              key="professionnels"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <ProfessionnelsView
                professionals={professionals}
                onAddProfessional={handleAddProfessional}
                onUpdateProfessional={handleUpdateProfessional}
                onDeleteProfessional={handleDeleteProfessional}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ═══ MODALS ══════════════════════════════════════════════════ */}
      {/* 1. Modal Urbanisme Wizard (CU, DP, PC) */}
      <UrbanismeWizard
        isOpen={urbanismeModal.open}
        onClose={() => setUrbanismeModal({ open: false, type: 'dp' })}
        type={urbanismeModal.type}
        project={selectedProject}
        onGenerate={handleUrbanismeGenerate}
      />

      {/* 2. Modal Génération Email Mandatement (Huissier, Géomètre, Notaire) */}
      <EmailMandatementModal
        isOpen={emailMandatementModal.open}
        onClose={() => setEmailMandatementModal({ open: false, type: 'geometre' })}
        type={emailMandatementModal.type}
        project={selectedProject}
        professionals={professionals}
        onMailSent={() => {
          setEmailMandatementModal({ open: false, type: 'geometre' });
          toast({ title: 'Mail préparé', description: 'Le mail de mandatement a été transmis.' });
        }}
      />

      {/* 3. Modal Raccordement Enedis */}
      <RaccordementModal
        isOpen={raccordementModal}
        onClose={() => setRaccordementModal(false)}
        project={selectedProject}
      />

      {/* 4. Modal AOS / AO */}
      <AosAoModal
        isOpen={aosModal}
        onClose={() => setAosModal(false)}
        project={selectedProject}
      />

      {/* 5. Modal Consuel */}
      <ConsuelModal
        isOpen={consuelModal}
        onClose={() => setConsuelModal(false)}
        project={selectedProject}
        onSave={(data) => {
          if (selectedProject) {
            setSelectedProject({ ...selectedProject, ...data });
          }
        }}
      />

      {/* ═══ ZONE DE RENDU HTML2CANVAS POUR LE PDF CERFA ════════════ */}
      {(() => {
        const rawActiveProj = pdfProjectState || selectedProject;
        if (!rawActiveProj) return null;
        const isProjectGreenInvest = isGreenInvest || rawActiveProj?.tenantId === 'green-invest' || rawActiveProj?.tenantId === 'greeninvest' || rawActiveProj?.tenant === 'greeninvest' || rawActiveProj?.tenant === 'green-invest' || Boolean(rawActiveProj?.isGreenInvest);
        const isProjectAcama = isAcama || rawActiveProj?.tenantId === 'acama' || Boolean(rawActiveProj?.isAcama);
        const isProjectNoBattery = isProjectAcama || isProjectGreenInvest;

        const activeProj = {
          ...rawActiveProj,
          isAcama: isProjectAcama,
          isGreenInvest: isProjectGreenInvest,
          tenantId: activeTenantId,
          isBattery: isProjectNoBattery ? false : (rawActiveProj.isBattery || false),
          batteryStorage: isProjectNoBattery ? { enabled: false } : rawActiveProj.batteryStorage
        };
        return (
          <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '297mm', pointerEvents: 'none', zIndex: -100, opacity: 1 }}>
            {/* DP & CU Plates */}
            <div id="dev-plate-cover"><PlateCover project={activeProj} installationType={activeProj.type || 'batiment_solaire'} /></div>
            <div id="dev-plate-situation"><PlateSituation project={activeProj} captures={activeProj.urbanisme_captures || {}} /></div>
            <div id="dev-plate-masse"><PlateMasse project={activeProj} captures={activeProj.urbanisme_captures || {}} /></div>

            {/* Planches DP Spécifiques Multi-Bâtiments */}
            <div id="dev-plate-coupe-multi">
              <PlateCoupeMulti project={activeProj} buildings={activeProj.buildings || [activeProj]} />
            </div>
            <div id="dev-plate-notice-dedicated">
              <PlateNoticeDedicated 
                project={activeProj} 
                noticeText={activeProj.noticeText || activeProj.noticeAgricole || activeProj.pc_notice || activeProj.description} 
              />
            </div>

            {((activeProj.buildings && activeProj.buildings.length > 0) ? activeProj.buildings : [activeProj]).map((b, bIdx) => {
              const bCaptures = {
                ...(activeProj.urbanisme_captures || {}),
                ...(b.captures || {}),
                ...(b.urbanisme_captures || {}),
                ...(b.masse_capture ? { masse_projet: b.masse_capture } : {}),
              };
              const bPhotos = {
                ...(b.photos || {}),
                ...(b.pc_photos || {}),
              };
              let bLen = Number(b.length || b.longueur || (isProjectAcama ? 30.0 : 37.5));
              let bWid = Number(b.width || b.largeur || (isProjectAcama ? 15.0 : 16.4));
              if (isProjectNoBattery && (bWid <= 6.0 || bLen <= 6.0)) {
                bLen = isProjectAcama ? 30.0 : 37.5;
                bWid = isProjectAcama ? 15.0 : 16.4;
              }
              let bName = b.name;
              if (isProjectNoBattery) {
                if (isProjectAcama) {
                  bName = `Bâtiment ${bLen.toFixed(0)}m × ${bWid.toFixed(0)}m`;
                } else if (bName) {
                  bName = bName.replace(/Station Batteries[^\)]*\)?/gi, 'Ombrière').trim();
                }
              }
              let bType = (isProjectNoBattery && (b.buildingType === 'battery_standalone' || !b.buildingType)) ? (isProjectAcama ? 'symetrique' : 'ombriere_pl') : (b.buildingType || 'ombriere_pl');

              const bProj = {
                ...activeProj,
                ...b,
                name: bName || (isProjectAcama ? 'Bâtiment 1' : `Ombrière ${bIdx + 1}`),
                isAcama: isProjectAcama,
                isGreenInvest: isProjectGreenInvest,
                tenantId: activeTenantId,
                isBattery: isProjectNoBattery ? false : (b.isBattery || false),
                largeur: String(bWid),
                longueur: String(bLen),
                hauteur_egout: String(b.eaveHeight || b.hauteur_egout || 4.0),
                pente: String(b.roofPitch || b.pente || 15),
                buildingType: bType,
                leftSide: b.leftSide || 'none',
                rightSide: b.rightSide || 'none',
                leftWidth: b.leftWidth || 4.0,
                rightWidth: b.rightWidth || 4.0,
                buildingName: bName || (isProjectAcama ? `Bâtiment ${bLen.toFixed(0)}m × ${bWid.toFixed(0)}m` : `Ombrière ${bIdx + 1}`),
                urbanisme_captures: bCaptures,
                captures: bCaptures,
                pc_photos: bPhotos,
                photos: bPhotos,
              };
              const suffix = bIdx === 0 ? '' : `-${bIdx}`;
              return (
                <React.Fragment key={`dp-b-${b.id || bIdx}`}>
                  {/* DP2 — Plan de masse individuel par structure */}
                  <div id={`dev-plate-masse${suffix}`}>
                    <PlateMasse project={bProj} captures={bCaptures} />
                  </div>
                  {/* DP3 — Plan en coupe par bâtiment */}
                  <div id={`dev-plate-section${suffix}`}>
                    <PlateSection 
                      project={bProj} 
                      captures={bProj.urbanisme_captures || {}} 
                      includeNotice={activeProj?.selectedPages?.dp_notice !== false}
                      noticeText={activeProj.noticeText || activeProj.noticeAgricole || activeProj.pc_notice || activeProj.description}
                    />
                  </div>
                  {/* DP4 — Façades & Toitures par bâtiment */}
                  <div id={`dev-plate-facades${suffix}`}><PlateFacades project={bProj} captures={bProj.urbanisme_captures || {}} /></div>
                  {/* DP6 — Insertion paysagère par bâtiment */}
                  <div id={`dev-plate-insertion${suffix}`}><DPPlateInsertion project={bProj} captures={bProj.urbanisme_captures || {}} photos={bProj.pc_photos || {}} /></div>
                  {/* DP7&DP8 — Environnement proche et lointain par bâtiment */}
                  <div id={`dev-plate-env${suffix}`}>
                    <PlateEnv 
                      project={bProj} 
                      captures={bProj.urbanisme_captures || {}} 
                      photos={bProj.pc_photos || {}} 
                      includeLointain={activeProj?.selectedPages?.dp8 !== false}
                    />
                  </div>
                  <div id={`dev-plate-env-proche${suffix}`}><PlateEnvProche project={bProj} captures={bProj.urbanisme_captures || {}} photos={bProj.pc_photos || {}} /></div>
                  <div id={`dev-plate-env-lointain${suffix}`}><PlateEnvLointain project={bProj} captures={bProj.urbanisme_captures || {}} photos={bProj.pc_photos || {}} /></div>
                  <div id={`dev-plate-notice${suffix}`}><PlateInsertionNotice project={bProj} noticeText={activeProj.noticeText || activeProj.noticeAgricole || activeProj.pc_notice || activeProj.description} /></div>
                </React.Fragment>
              );
            })}

            {/* PC Plates — Multi-Bâtiments */}
            <div id="dev-pc-plate-cover"><PCPlateCover project={activeProj} installationType={activeProj.type || 'batiment_solaire'} /></div>
            <div id="dev-pc-plate-situation"><PCPlateSituation project={activeProj} captures={activeProj.urbanisme_captures || {}} /></div>
            <div id="dev-pc-plate-masse"><PCPlateMasse project={activeProj} captures={activeProj.urbanisme_captures || {}} /></div>

            {((activeProj.buildings && activeProj.buildings.length > 0) ? activeProj.buildings : [activeProj]).map((b, bIdx) => {
              const bCaptures = {
                ...(activeProj.urbanisme_captures || {}),
                ...(b.captures || {}),
                ...(b.urbanisme_captures || {}),
                ...(b.masse_capture ? { masse_projet: b.masse_capture } : {}),
              };
              const bPhotos = {
                ...(b.photos || {}),
                ...(b.pc_photos || {}),
              };
              let bLen = Number(b.length || b.longueur || (isProjectAcama ? 30.0 : 30.0));
              let bWid = Number(b.width || b.largeur || (isProjectAcama ? 15.0 : 20.0));
              if (isProjectNoBattery && (bWid <= 6.0 || bLen <= 6.0)) {
                bLen = isProjectAcama ? 30.0 : 30.0;
                bWid = isProjectAcama ? 15.0 : 20.0;
              }
              let bName = b.name;
              if (isProjectNoBattery) {
                if (isProjectAcama) {
                  bName = `Bâtiment ${bLen.toFixed(0)}m × ${bWid.toFixed(0)}m`;
                } else if (bName) {
                  bName = bName.replace(/Station Batteries[^\)]*\)?/gi, 'Bâtiment').trim();
                }
              }
              let bType = (isProjectNoBattery && (b.buildingType === 'battery_standalone' || !b.buildingType)) ? (isProjectAcama ? 'symetrique' : 'asymetrique_1') : (b.buildingType || 'asymetrique_1');

              const bProj = {
                ...activeProj,
                ...b,
                name: bName || `Bâtiment ${bIdx + 1}`,
                isAcama: isProjectAcama,
                isGreenInvest: isProjectGreenInvest,
                tenantId: activeTenantId,
                isBattery: isProjectNoBattery ? false : (b.isBattery || false),
                largeur: String(bWid),
                longueur: String(bLen),
                hauteur_egout: String(b.eaveHeight || b.hauteur_egout || 4.0),
                pente: String(b.roofPitch || b.pente || 15),
                buildingType: bType,
                leftSide: b.leftSide || 'none',
                rightSide: b.rightSide || 'none',
                leftWidth: b.leftWidth || 4.0,
                rightWidth: b.rightWidth || 4.0,
                buildingName: bName || (isProjectAcama ? `Bâtiment ${bLen.toFixed(0)}m × ${bWid.toFixed(0)}m` : `Bâtiment ${bIdx + 1}`),
                urbanisme_captures: bCaptures,
                captures: bCaptures,
                pc_photos: bPhotos,
                photos: bPhotos,
              };
              const suffix = bIdx === 0 ? '' : `-${bIdx}`;
              return (
                <React.Fragment key={`pc-b-${b.id || bIdx}`}>
                  {/* PC2 — Plan de masse individuel par structure */}
                  <div id={`dev-pc-plate-masse${suffix}`}>
                    <PCPlateMasse project={bProj} captures={bCaptures} />
                  </div>
                  <div id={`dev-pc-plate-section-notice${suffix}`}>
                    <PCPlateSectionAndNotice 
                      project={bProj} 
                      noticeText={activeProj.noticeText || activeProj.noticeAgricole || activeProj.pc_notice || activeProj.description} 
                    />
                  </div>
                  <div id={`dev-pc-plate-facades${suffix}`}><PCPlateFacades project={bProj} captures={bProj.urbanisme_captures || {}} /></div>
                  <div id={`dev-pc-plate-insertion${suffix}`}><PCPlateInsertion project={bProj} photos={bProj.pc_photos || {}} /></div>
                  <div id={`dev-pc-plate-env${suffix}`}>
                    <PCPlateEnv 
                      project={bProj} 
                      captures={bProj.urbanisme_captures || {}} 
                      photos={bProj.pc_photos || {}} 
                    />
                  </div>
                  <div id={`dev-pc-plate-env-proche${suffix}`}>
                    <PCPlateEnvProche 
                      project={bProj} 
                      captures={bProj.urbanisme_captures || {}} 
                      photos={bProj.pc_photos || {}} 
                    />
                  </div>
                  <div id={`dev-pc-plate-env-lointain${suffix}`}>
                    <PCPlateEnvLointain 
                      project={bProj} 
                      captures={bProj.urbanisme_captures || {}} 
                      photos={bProj.pc_photos || {}} 
                    />
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
